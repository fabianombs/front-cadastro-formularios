terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "app-forms-clients-terraform-state"
    key    = "terraform.tfstate"
    region = "sa-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# ACM certificates must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ─────────────────────────────────────────────
# S3 BUCKETS
# ─────────────────────────────────────────────

resource "aws_s3_bucket" "homol" {
  bucket        = "${var.project_name}-homol"
  force_destroy = true

  tags = {
    Environment = "homol"
    Project     = var.project_name
  }
}

resource "aws_s3_bucket" "prod" {
  bucket        = "${var.project_name}-prod"
  force_destroy = false

  tags = {
    Environment = "prod"
    Project     = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "homol" {
  bucket                  = aws_s3_bucket.homol.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "prod" {
  bucket                  = aws_s3_bucket.prod.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─────────────────────────────────────────────
# CLOUDFRONT ORIGIN ACCESS CONTROL (OAC)
# ─────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "homol" {
  name                              = "${var.project_name}-homol-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "prod" {
  name                              = "${var.project_name}-prod-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─────────────────────────────────────────────
# CLOUDFRONT DISTRIBUTIONS
# ─────────────────────────────────────────────

resource "aws_cloudfront_distribution" "homol" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  aliases = var.homol_domain != "" ? [var.homol_domain] : []

  origin {
    domain_name              = aws_s3_bucket.homol.bucket_regional_domain_name
    origin_id                = "s3-homol"
    origin_access_control_id = aws_cloudfront_origin_access_control.homol.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-homol"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 31536000
  }

  # SPA routing: return index.html for 403/404
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == ""
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : "TLSv1"
  }

  tags = {
    Environment = "homol"
    Project     = var.project_name
  }
}

resource "aws_cloudfront_distribution" "prod" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  aliases = var.prod_domain != "" ? [var.prod_domain] : []

  origin {
    domain_name              = aws_s3_bucket.prod.bucket_regional_domain_name
    origin_id                = "s3-prod"
    origin_access_control_id = aws_cloudfront_origin_access_control.prod.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-prod"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 31536000
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == ""
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : "TLSv1"
  }

  tags = {
    Environment = "prod"
    Project     = var.project_name
  }
}

# ─────────────────────────────────────────────
# S3 BUCKET POLICIES (allow only CloudFront OAC)
# ─────────────────────────────────────────────

data "aws_iam_policy_document" "homol_bucket_policy" {
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.homol.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.homol.arn]
    }
  }
}

data "aws_iam_policy_document" "prod_bucket_policy" {
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.prod.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.prod.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "homol" {
  bucket = aws_s3_bucket.homol.id
  policy = data.aws_iam_policy_document.homol_bucket_policy.json
}

resource "aws_s3_bucket_policy" "prod" {
  bucket = aws_s3_bucket.prod.id
  policy = data.aws_iam_policy_document.prod_bucket_policy.json
}

# ─────────────────────────────────────────────
# IAM USER FOR GITHUB ACTIONS (least privilege)
# ─────────────────────────────────────────────

resource "aws_iam_user" "github_actions" {
  name = "${var.project_name}-github-actions"

  tags = {
    Project = var.project_name
  }
}

data "aws_iam_policy_document" "github_actions_policy" {
  statement {
    sid    = "S3DeployAccess"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.homol.arn,
      "${aws_s3_bucket.homol.arn}/*",
      aws_s3_bucket.prod.arn,
      "${aws_s3_bucket.prod.arn}/*",
    ]
  }

  statement {
    sid    = "CloudFrontInvalidation"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
    ]
    resources = [
      aws_cloudfront_distribution.homol.arn,
      aws_cloudfront_distribution.prod.arn,
    ]
  }
}

resource "aws_iam_user_policy" "github_actions" {
  name   = "${var.project_name}-deploy-policy"
  user   = aws_iam_user.github_actions.name
  policy = data.aws_iam_policy_document.github_actions_policy.json
}

resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name
}
