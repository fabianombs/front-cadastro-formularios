output "homol_cloudfront_domain" {
  description = "CloudFront domain for homol environment"
  value       = aws_cloudfront_distribution.homol.domain_name
}

output "homol_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for homol (use in CF_DISTRIBUTION_HOMOL secret)"
  value       = aws_cloudfront_distribution.homol.id
}

output "prod_cloudfront_domain" {
  description = "CloudFront domain for prod environment"
  value       = aws_cloudfront_distribution.prod.domain_name
}

output "prod_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for prod (use in CF_DISTRIBUTION_PROD secret)"
  value       = aws_cloudfront_distribution.prod.id
}

output "github_actions_access_key_id" {
  description = "AWS access key ID for GitHub Actions (use in AWS_ACCESS_KEY_ID secret)"
  value       = aws_iam_access_key.github_actions.id
}

output "github_actions_secret_access_key" {
  description = "AWS secret access key for GitHub Actions (use in AWS_SECRET_ACCESS_KEY secret)"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}
