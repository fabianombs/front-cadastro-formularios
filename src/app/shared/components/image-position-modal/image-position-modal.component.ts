import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ImagePositionConfig {
  field: 'headerImageUrl' | 'footerImageUrl' | 'backgroundImageUrl';
  dataUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  label: string;
  /** Cor de fundo para preencher as áreas não cobertas pela imagem */
  fillColor: string;
}

@Component({
  selector: 'app-image-position-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-position-modal.component.html',
  styleUrls: ['./image-position-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagePositionModalComponent implements OnChanges {
  @Input() config: ImagePositionConfig | null = null;
  @Output() confirmed = new EventEmitter<{ blob: Blob; field: string }>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('cropArea') cropAreaRef!: ElementRef<HTMLDivElement>;
  @ViewChild('img') imgRef!: ElementRef<HTMLImageElement>;

  private cdr = inject(ChangeDetectorRef);

  scale = 1.0;
  offsetX = 0;
  offsetY = 0;

  isDragging = false;
  imageReady = false;
  exporting = false;

  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartOffsetX = 0;
  private dragStartOffsetY = 0;

  naturalWidth = 0;
  naturalHeight = 0;

  /** Escala "cover" — usada apenas pelo botão Ajustar, não como mínimo */
  coverScale = 1.0;
  /** Escala mínima livre: 5% do tamanho natural */
  readonly MIN_SCALE = 0.05;
  readonly MAX_SCALE = 6.0;

  get scalePercent(): number {
    return Math.round(this.scale * 100);
  }

  get cropAspectRatio(): string {
    if (!this.config) return '3 / 1';
    return `${this.config.canvasWidth} / ${this.config.canvasHeight}`;
  }

  get zoomFillPercent(): number {
    return Math.max(0, Math.min(100,
      ((this.scale - this.MIN_SCALE) / (this.MAX_SCALE - this.MIN_SCALE)) * 100
    ));
  }

  get imgStyle(): { [key: string]: string } {
    return {
      position: 'absolute',
      top: '0',
      left: '0',
      width: `${this.naturalWidth}px`,
      height: `${this.naturalHeight}px`,
      transform: `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`,
      transformOrigin: '0 0',
      userSelect: 'none',
      pointerEvents: 'none',
      willChange: 'transform',
    };
  }

  /** Cor de fundo para o preview do crop area */
  get cropAreaBg(): string {
    return this.config?.fillColor || '#0d1120';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.imageReady = false;
      this.exporting = false;
    }
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth = img.naturalWidth;
    this.naturalHeight = img.naturalHeight;
    this.imageReady = true;
    requestAnimationFrame(() => {
      this.fitImage();
      this.cdr.markForCheck();
    });
  }

  /** Ajusta ao modo "cover" — cobre toda a área sem bordas */
  fitImage(): void {
    const el = this.cropAreaRef?.nativeElement;
    if (!el || !this.imageReady) return;
    const cW = el.clientWidth;
    const cH = el.clientHeight;
    const scaleX = cW / this.naturalWidth;
    const scaleY = cH / this.naturalHeight;
    this.coverScale = Math.max(scaleX, scaleY);
    this.scale = this.coverScale;
    const sw = this.naturalWidth * this.scale;
    const sh = this.naturalHeight * this.scale;
    this.offsetX = (cW - sw) / 2;
    this.offsetY = (cH - sh) / 2;
  }

  // ── Drag ──────────────────────────────────────────────────────

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartOffsetX = this.offsetX;
    this.dragStartOffsetY = this.offsetY;
    this.cdr.markForCheck();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    this.offsetX = this.dragStartOffsetX + (event.clientX - this.dragStartX);
    this.offsetY = this.dragStartOffsetY + (event.clientY - this.dragStartY);
    this.clampOffset();
    this.cdr.markForCheck();
  }

  onPointerUp(): void {
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  // ── Zoom ──────────────────────────────────────────────────────

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const el = this.cropAreaRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const pivotX = event.clientX - rect.left;
    const pivotY = event.clientY - rect.top;
    const delta = event.deltaY < 0 ? 0.07 : -0.07;
    this.applyZoom(pivotX, pivotY, delta);
    this.cdr.markForCheck();
  }

  zoomIn(): void {
    const el = this.cropAreaRef.nativeElement;
    this.applyZoom(el.clientWidth / 2, el.clientHeight / 2, 0.15);
    this.cdr.markForCheck();
  }

  zoomOut(): void {
    const el = this.cropAreaRef.nativeElement;
    this.applyZoom(el.clientWidth / 2, el.clientHeight / 2, -0.15);
    this.cdr.markForCheck();
  }

  resetView(): void {
    this.fitImage();
    this.cdr.markForCheck();
  }

  private applyZoom(pivotX: number, pivotY: number, delta: number): void {
    const oldScale = this.scale;
    // Zoom completamente livre — só o mínimo absoluto de 5%
    const newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, oldScale * (1 + delta)));
    const ratio = newScale / oldScale;
    this.offsetX = pivotX - ratio * (pivotX - this.offsetX);
    this.offsetY = pivotY - ratio * (pivotY - this.offsetY);
    this.scale = newScale;
    this.clampOffset();
  }

  /** Mantém pelo menos 10% da imagem visível para não perder o controle */
  private clampOffset(): void {
    const el = this.cropAreaRef?.nativeElement;
    if (!el) return;
    const cW = el.clientWidth;
    const cH = el.clientHeight;
    const sw = this.naturalWidth * this.scale;
    const sh = this.naturalHeight * this.scale;
    const minVisibleX = Math.max(sw * 0.1, 15);
    const minVisibleY = Math.max(sh * 0.1, 15);
    this.offsetX = Math.min(cW - minVisibleX, Math.max(minVisibleX - sw, this.offsetX));
    this.offsetY = Math.min(cH - minVisibleY, Math.max(minVisibleY - sh, this.offsetY));
  }

  // ── Export ────────────────────────────────────────────────────

  confirmCrop(): void {
    if (!this.config || !this.imageReady || this.exporting) return;
    const el = this.cropAreaRef.nativeElement;
    const cW = el.clientWidth;
    const cH = el.clientHeight;
    const { canvasWidth, canvasHeight, fillColor } = this.config;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    const hasFill = fillColor && fillColor !== 'transparent';

    // 1. Preenche fundo apenas se o usuário definiu uma cor sólida
    if (hasFill) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    // Sem cor definida: fundo permanece transparente (exportado como PNG)

    // 2. Escala de mapeamento: display → canvas
    const mapX = canvasWidth / cW;
    const mapY = canvasHeight / cH;

    // 3. Desenha a imagem na posição exata que o usuário configurou
    const destX = this.offsetX * mapX;
    const destY = this.offsetY * mapY;
    const destW = this.naturalWidth * this.scale * mapX;
    const destH = this.naturalHeight * this.scale * mapY;

    ctx.drawImage(
      this.imgRef.nativeElement,
      0, 0, this.naturalWidth, this.naturalHeight,
      destX, destY, destW, destH,
    );

    this.exporting = true;
    this.cdr.markForCheck();

    // JPEG quando há cor de fundo (sem transparência), PNG quando fundo é transparente
    const mimeType = hasFill ? 'image/jpeg' : 'image/png';
    const quality  = hasFill ? 0.93 : undefined;

    canvas.toBlob(
      (blob) => {
        this.exporting = false;
        if (blob && this.config) {
          this.confirmed.emit({ blob, field: this.config.field });
        }
        this.cdr.markForCheck();
      },
      mimeType,
      quality,
    );
  }

  cancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('ipm-backdrop')) {
      this.cancel();
    }
  }
}
