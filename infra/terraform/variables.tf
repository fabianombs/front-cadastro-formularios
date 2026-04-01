variable "project_name" {
  description = "Base name for all resources"
  type        = string
  default     = "app-forms-clients"
}

variable "aws_region" {
  description = "Primary AWS region for S3 and IAM"
  type        = string
  default     = "sa-east-1"
}

variable "homol_domain" {
  description = "Custom domain for homol CloudFront (leave empty to skip ACM)"
  type        = string
  default     = ""
}

variable "prod_domain" {
  description = "Custom domain for prod CloudFront (leave empty to skip ACM)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1) — required if using custom domains"
  type        = string
  default     = ""
}
