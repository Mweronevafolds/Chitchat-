# 🚨 CRITICAL SECURITY FIX - API Key Exposure

## ⚠️ What Happened

Your Google Gemini API key (`AIzaSyBcjIxiS-zk9AIyQbXKA1H3RkX3Cre3mNI`) was accidentally committed to your GitHub repository and is now publicly visible.

**Exposed at:** `https://github.com/Mweronevafolds/Chitchat-/blob/b756bb838e81171a98f8d1b6045a3128065a6b98/backend/.env`

## ✅ Immediate Actions Required (DO THIS NOW!)

### Step 1: Rotate the Compromised API Key

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Navigate to Credentials:**
   - Click on the navigation menu (☰)
   - Go to **APIs & Services** → **Credentials**
   - Or search for "Credentials" in the search bar

3. **Find Your API Key:**
   - Look for the key: `AIzaSyBcjIxiS-uju79QbXKA1H3RkX3Cre3mNI`
   - It should be under **API Keys** section
   -

4. **Regenerate the Key:**
   - Click on the key name to open details
   - Click **"Regenerate Key"** button
   - Confirm the regeneration
   - **Copy the new key immediately** (you can't see it again!)

5. **Alternative - Create New Key & Delete Old:**
   - Click **"+ CREATE CREDENTIALS"** → **"API Key"**
   - Copy the new key
   - Delete the old compromised key

6. **Update Your Local .env File:**
   ```bash
   cd c:\macode\ChitChat\backend
   # Edit .env file with new key
   notepad .env
   ```

### Step 2: Remove the .env File from Git History

The file was already committed to Git history. You need to remove it completely:

```powershell
# Navigate to your project
cd c:\macode\ChitChat

# Remove .env from Git tracking (if still there)
git rm --cached backend/.env

# Remove from Git history using filter-branch (CAREFUL!)
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch backend/.env" --prune-empty --tag-name-filter cat -- --all

# Or use BFG Repo-Cleaner (recommended, faster)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
# Then run:
# java -jar bfg.jar --delete-files .env

# Force push to overwrite history (WARNING: This rewrites history!)
git push origin --force --all
git push origin --force --tags
```

**⚠️ WARNING:** Rewriting Git history affects all collaborators. Coordinate with your team!

### Step 3: Verify .gitignore is Working

Your `.gitignore` already includes `.env`, but let's verify:

```powershell
# Check .gitignore contains .env
Select-String -Path .gitignore -Pattern ".env"

# Create .env if it doesn't exist
if (!(Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }

# Verify .env is NOT tracked
git status
# You should NOT see backend/.env in the list
```

### Step 4: Add API Key Restrictions (Important!)

Protect your new key with restrictions:

1. **In Google Cloud Console** → **Credentials** → **Your API Key**
2. **Application restrictions:**
   - Select "HTTP referrers" for web apps
   - Or "IP addresses" for backend servers
   - Add your server's IP addresses

3. **API restrictions:**
   - Select "Restrict key"
   - Only enable: **Generative Language API**
   - Remove all other API access

4. **Set usage quotas** to prevent abuse:
   - Go to **APIs & Services** → **Quotas**
   - Set reasonable daily limits

### Step 5: Check for Unauthorized Usage

1. **Review API Usage:**
   - Go to **APIs & Services** → **Dashboard**
   - Check for unexpected spikes in usage
   - Look at the timeline for when the key was exposed

2. **Check Billing:**
   - Go to **Billing** → **Reports**
   - Look for unusual charges
   - Set up budget alerts

3. **Set Up Alerts:**
   - Go to **Billing** → **Budgets & alerts**
   - Create a budget alert (e.g., $10/day)
   - Get notified of unusual activity

## 🔒 Prevention - Best Practices Going Forward

### 1. Never Commit Secrets

**Always use environment variables:**
```javascript
// ✅ GOOD
const apiKey = process.env.GEMINI_API_KEY;

// ❌ BAD
const apiKey = "AIzaSyBc..."; // Never hardcode!
```

### 2. Use .env.example

Keep a template in your repo:
```bash
# .env.example (safe to commit)
GEMINI_API_KEY=your_key_here
SUPABASE_URL=your_url_here

# .env (NEVER commit)
GEMINI_API_KEY=AIzaSyBcjIxiS...
SUPABASE_URL=https://...
```

### 3. Pre-commit Hooks

Install git-secrets to prevent commits with secrets:

```powershell
# Install git-secrets (requires Git for Windows)
# Download from: https://github.com/awslabs/git-secrets

# Or use npm package
npm install -g @commitlint/cli
```

### 4. Use Environment Variable Management

**For Development:**
- Use `.env` files (already set up ✓)
- Keep backups in password manager

**For Production:**
- Use environment variables in hosting platform
- Render.com: Environment tab
- Vercel: Environment Variables
- Heroku: Config Vars

### 5. Regular Security Audits

```powershell
# Check for exposed secrets in commit history
git log --all --full-history --source -- backend/.env

# Use tools like truffleHog or GitGuardian
npm install -g truffleHog
trufflehog git file://. --only-verified
```

## 📋 Checklist

Use this to ensure you've completed all steps:

- [ ] **CRITICAL:** Regenerated/deleted exposed API key in Google Cloud Console
- [ ] **CRITICAL:** Updated `.env` file with new key
- [ ] **CRITICAL:** Tested app works with new key
- [ ] Removed `.env` from Git history (filter-branch or BFG)
- [ ] Force-pushed cleaned history to GitHub
- [ ] Added API key restrictions in Google Cloud Console
- [ ] Set up usage quotas and billing alerts
- [ ] Reviewed usage logs for unauthorized access
- [ ] Checked billing for unexpected charges
- [ ] Verified `.gitignore` includes `.env`
- [ ] Created `.env.example` template (already done ✓)
- [ ] Documented environment setup in README
- [ ] Educated team members about security practices
- [ ] Set up git hooks to prevent future commits

## 🔍 How to Check If Key is Still Exposed

1. **GitHub Search:**
   - Go to your repository on GitHub
   - Search for: `AIzaSyBcjIxiS`
   - Should return **0 results** after cleanup

2. **Git History Search:**
   ```powershell
   cd c:\macode\ChitChat
   git log --all --full-history --source -S "AIzaSyBcjIxiS"
   # Should return no results
   ```

3. **Google Search:**
   - Search: `"AIzaSyBcjIxiS" site:github.com`
   - GitHub caches may take 24-48 hours to clear

4. **Use GitGuardian:**
   - Visit: https://www.gitguardian.com/
   - They scan public repos automatically
   - Check if they still detect it

## 🆘 If You Need Help

**Google Cloud Support:**
- Visit: https://cloud.google.com/support
- Select: "Billing" or "Security Issue"
- Priority: High

**GitHub Support (if key still visible):**
- Contact: https://support.github.com/
- Request cache invalidation for specific commit

## 📚 Additional Resources

- [Google API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [GitHub Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Git-Secrets Tool](https://github.com/awslabs/git-secrets)

## 🎯 Summary

**Immediate Priority:**
1. Regenerate the API key (5 minutes)
2. Update your `.env` file (1 minute)
3. Test your app works (2 minutes)

**Within 24 Hours:**
4. Clean Git history (15 minutes)
5. Add API restrictions (10 minutes)
6. Review usage logs (5 minutes)

**This Week:**
7. Set up monitoring and alerts
8. Install security tools
9. Document procedures for team

---

**Last Updated:** November 25, 2025  
**Status:** 🚨 REQUIRES IMMEDIATE ACTION
