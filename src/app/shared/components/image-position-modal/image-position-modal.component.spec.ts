import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { SimpleChanges } from '@angular/core';
import { ImagePositionModalComponent, ImagePositionConfig } from './image-position-modal.component';

const mockConfig: ImagePositionConfig = {
  field: 'headerImageUrl',
  dataUrl: 'data:image/png;base64,abc',
  canvasWidth: 1200,
  canvasHeight: 400,
  label: 'Cabeçalho',
  fillColor: '#ffffff',
};

describe('ImagePositionModalComponent', () => {
  let component: ImagePositionModalComponent;
  let fixture: ComponentFixture<ImagePositionModalComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ImagePositionModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagePositionModalComponent);
    component = fixture.componentInstance;
    // Não chama detectChanges para evitar erro do @ViewChild
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  // ─── getters simples ──────────────────────────────────────────────────────

  it('scalePercent deve retornar escala * 100 arredondada', () => {
    component.scale = 1.5;
    expect(component.scalePercent).toBe(150);
  });

  it('cropAspectRatio deve retornar "3 / 1" quando config é null', () => {
    component.config = null;
    expect(component.cropAspectRatio).toBe('3 / 1');
  });

  it('cropAspectRatio deve usar dimensões do config', () => {
    component.config = mockConfig;
    expect(component.cropAspectRatio).toBe('1200 / 400');
  });

  it('zoomFillPercent deve calcular percentual entre MIN e MAX_SCALE', () => {
    component.scale = component.MIN_SCALE;
    expect(component.zoomFillPercent).toBe(0);
    component.scale = component.MAX_SCALE;
    expect(component.zoomFillPercent).toBe(100);
  });

  it('imgStyle deve retornar objeto com transform CSS', () => {
    component.naturalWidth = 800;
    component.naturalHeight = 600;
    component.offsetX = 10;
    component.offsetY = 20;
    component.scale = 1.5;
    const style = component.imgStyle;
    expect(style['transform']).toContain('translate(10px, 20px)');
    expect(style['transform']).toContain('scale(1.5)');
    expect(style['width']).toBe('800px');
    expect(style['height']).toBe('600px');
  });

  it('cropAreaBg deve retornar fillColor do config', () => {
    component.config = mockConfig;
    expect(component.cropAreaBg).toBe('#ffffff');
  });

  it('cropAreaBg deve retornar cor padrão quando config é null', () => {
    component.config = null;
    expect(component.cropAreaBg).toBe('#0d1120');
  });

  // ─── ngOnChanges ──────────────────────────────────────────────────────────

  it('ngOnChanges deve resetar estado quando config muda', () => {
    component.scale = 2.5;
    component.offsetX = 50;
    component.imageReady = true;
    const changes: SimpleChanges = {
      config: { currentValue: mockConfig, previousValue: null, firstChange: true, isFirstChange: () => true },
    };
    component.config = mockConfig;
    component.ngOnChanges(changes);
    expect(component.scale).toBe(1);
    expect(component.offsetX).toBe(0);
    expect(component.offsetY).toBe(0);
    expect(component.imageReady).toBe(false);
  });

  it('ngOnChanges não deve resetar quando config não muda', () => {
    component.scale = 2.5;
    const changes: SimpleChanges = {
      // 'config' não está no changes
    };
    component.ngOnChanges(changes);
    expect(component.scale).toBe(2.5);
  });

  // ─── onPointerDown / onPointerMove / onPointerUp ──────────────────────────

  it('onPointerDown deve iniciar dragging e capturar offset', () => {
    component.offsetX = 10;
    component.offsetY = 20;
    const mockEl = { setPointerCapture: vi.fn() } as unknown as HTMLElement;
    const event = {
      button: 0,
      preventDefault: vi.fn(),
      currentTarget: mockEl,
      pointerId: 1,
      clientX: 100,
      clientY: 200,
    } as unknown as PointerEvent;
    component.onPointerDown(event);
    expect(component.isDragging).toBe(true);
  });

  it('onPointerDown não deve iniciar dragging com botão diferente de 0', () => {
    const event = { button: 1, preventDefault: vi.fn() } as unknown as PointerEvent;
    component.onPointerDown(event);
    expect(component.isDragging).toBe(false);
  });

  it('onPointerUp deve parar dragging', () => {
    component.isDragging = true;
    component.onPointerUp();
    expect(component.isDragging).toBe(false);
  });

  it('onPointerMove não deve mover quando não está dragging', () => {
    component.isDragging = false;
    component.offsetX = 10;
    const event = { preventDefault: vi.fn(), clientX: 200, clientY: 300 } as unknown as PointerEvent;
    component.onPointerMove(event);
    expect(component.offsetX).toBe(10);
  });

  // ─── cancel / onBackdropClick ─────────────────────────────────────────────

  it('cancel deve emitir evento cancelled', () => {
    const emitSpy = vi.spyOn(component.cancelled, 'emit');
    component.cancel();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('onBackdropClick deve cancelar quando target tem classe ipm-backdrop', () => {
    const cancelSpy = vi.spyOn(component, 'cancel');
    const target = document.createElement('div');
    target.classList.add('ipm-backdrop');
    component.onBackdropClick({ target } as unknown as MouseEvent);
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('onBackdropClick não deve cancelar sem classe ipm-backdrop', () => {
    const cancelSpy = vi.spyOn(component, 'cancel');
    const target = document.createElement('button');
    component.onBackdropClick({ target } as unknown as MouseEvent);
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  // ─── onImageLoad ──────────────────────────────────────────────────────────

  it('onImageLoad deve definir dimensões naturais e imageReady', () => {
    const img = { naturalWidth: 1200, naturalHeight: 800 } as HTMLImageElement;
    const event = { target: img } as unknown as Event;
    component.onImageLoad(event);
    expect(component.naturalWidth).toBe(1200);
    expect(component.naturalHeight).toBe(800);
    expect(component.imageReady).toBe(true);
  });
});
