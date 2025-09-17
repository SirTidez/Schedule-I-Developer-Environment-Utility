# Production Security Setup Guide

## Environment Variable Configuration

### Windows (Current Setup)
The GitHub token is now configured as a permanent user environment variable:

```powershell
# Verify the token is set
[Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")

# If you need to update it later
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_new_token", "User")
```

### Alternative Methods for Production

#### Method 1: System Environment Variable (Most Secure)
```powershell
# Set system-wide (requires admin privileges)
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token", "Machine")
```

#### Method 2: .env File (Development Only)
Create a `.env` file in your project root:
```env
GITHUB_TOKEN=your_github_token_here
```

#### Method 3: CI/CD Platform Secrets
For automated deployments, use your platform's secret management:

**GitHub Actions:**
```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Azure DevOps:**
- Go to Pipelines → Library → Variable Groups
- Add `GITHUB_TOKEN` as a secret variable

**Jenkins:**
- Go to Manage Jenkins → Manage Credentials
- Add `GITHUB_TOKEN` as a secret text credential

## Security Best Practices

### 1. Token Permissions
Your token should have minimal required permissions:
- ✅ `repo` (Full control of private repositories)
- ✅ `write:packages` (Upload packages to GitHub Package Registry)
- ❌ Avoid `admin` or unnecessary permissions

### 2. Token Rotation
- Set expiration date (recommended: 1 year)
- Rotate tokens regularly
- Monitor token usage in GitHub settings

### 3. Environment Isolation
- Use different tokens for different environments
- Never use production tokens in development
- Use separate GitHub accounts if possible

### 4. Access Control
- Limit token access to specific repositories
- Use organization-level tokens when possible
- Regularly audit token usage

## Production Deployment Checklist

### Before Deployment:
- [ ] Verify `GITHUB_TOKEN` is set in production environment
- [ ] Test token permissions with a dry run
- [ ] Ensure repository name matches exactly
- [ ] Verify release tagging strategy

### After Deployment:
- [ ] Test update checking functionality
- [ ] Verify download and install process
- [ ] Monitor logs for any authentication errors
- [ ] Test with a new release

## Troubleshooting

### Common Issues:
1. **"Authentication failed"**
   - Check token permissions
   - Verify token hasn't expired
   - Ensure token is set in correct environment

2. **"Repository not found"**
   - Verify repository name in package.json
   - Check token has access to the repository
   - Ensure repository is public or token has private access

3. **"No releases found"**
   - Check if releases exist on GitHub
   - Verify release tags follow version format (v1.0.0)
   - Ensure releases are published (not drafts)

### Testing Commands:
```bash
# Test environment variable
echo $env:GITHUB_TOKEN

# Test package publishing
npm run package

# Test update checking in app
# Use the UpdateManager component
```

## Security Monitoring

### Regular Checks:
- Monitor GitHub token usage in account settings
- Check for unauthorized access attempts
- Review token permissions quarterly
- Rotate tokens annually

### Log Monitoring:
- Watch for authentication errors in app logs
- Monitor update check frequency
- Alert on failed update attempts

## Emergency Procedures

### If Token is Compromised:
1. Immediately revoke the token in GitHub settings
2. Generate a new token with same permissions
3. Update environment variable in all environments
4. Test update functionality with new token

### If Updates Stop Working:
1. Check token expiration
2. Verify repository permissions
3. Test with a new release
4. Check network connectivity
5. Review application logs

This setup provides enterprise-grade security while maintaining ease of use for your auto-updater system.
