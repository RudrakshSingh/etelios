# 🔑 GitHub to Azure DevOps Token Guide

## **Quick Steps to Generate Token**

### **Step 1: Get Azure DevOps Token**

1. **Go to Azure DevOps:**
   ```
   https://dev.azure.com/Hindempire-devops1/_usersSettings/tokens
   ```

2. **Click "New Token"**

3. **Configure Token:**
   ```
   Name: GitHub Integration
   Organization: Hindempire-devops1
   Expiration: 1 year
   Scopes: ✅ All scopes (Full access)
   ```

4. **Click "Create"**

5. **Copy the token immediately** (save it securely!)

### **Step 2: Add to GitHub Secrets**

1. **Go to GitHub Repository:**
   ```
   https://github.com/RudrakshSingh/etelios/settings/secrets/actions
   ```

2. **Click "New repository secret"**

3. **Add Secret:**
   ```
   Name: AZURE_DEVOPS_TOKEN
   Value: [paste your token here]
   ```

4. **Click "Add secret"**

### **Step 3: Test the Connection**

The GitHub Actions workflow will automatically use this token to push to Azure DevOps.

## **Alternative: Use GitHub CLI (if you have it)**

```bash
# Install GitHub CLI (if not installed)
brew install gh

# Login to GitHub
gh auth login

# Add secret via CLI
gh secret set AZURE_DEVOPS_TOKEN --body "your-token-here"
```

## **What Happens Next**

1. **GitHub Actions will automatically:**
   - Use the token to authenticate with Azure DevOps
   - Push code to Azure DevOps repository
   - Set up CI/CD pipelines

2. **Check GitHub Actions:**
   - Go to: `https://github.com/RudrakshSingh/etelios/actions`
   - Look for the "Azure DevOps CI/CD Pipeline" workflow

3. **Verify Azure DevOps:**
   - Go to: `https://dev.azure.com/Hindempire-devops1/etelios`
   - Check if the repository is created and code is pushed

## **Troubleshooting**

### **If Token Generation Fails:**
1. Make sure you're logged into Azure DevOps
2. Check that you have the right permissions
3. Try creating the token with different scopes

### **If GitHub Secret Addition Fails:**
1. Make sure you're the repository owner
2. Check that you have admin permissions
3. Try using GitHub CLI instead

### **If Connection Still Fails:**
1. Verify the token is correct
2. Check Azure DevOps repository exists
3. Review GitHub Actions logs

## **Success Indicators**

✅ Token generated in Azure DevOps  
✅ Secret added to GitHub  
✅ GitHub Actions workflow runs  
✅ Code pushed to Azure DevOps  
✅ Azure DevOps repository created  

---

**Need Help?** Check the detailed guides:
- `AZURE-DEVOPS-SETUP-GUIDE.md`
- `AZURE-DEVOPS-QUICK-FIX.md`
