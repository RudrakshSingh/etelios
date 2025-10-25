#!/bin/bash

# Fix Azure DevOps Push Script
# This script helps you fix the Azure DevOps push issues

set -e

echo "🔧 Azure DevOps Push Fix Script"
echo "=============================="

# Configuration
AZURE_DEVOPS_ORG="Hindempire-devops1"
AZURE_DEVOPS_PROJECT="etelios"
AZURE_DEVOPS_REPO="etelios"

echo "📋 Current Configuration:"
echo "  Organization: $AZURE_DEVOPS_ORG"
echo "  Project: $AZURE_DEVOPS_PROJECT"
echo "  Repository: $AZURE_DEVOPS_REPO"
echo ""

echo "🔍 Current Git Remotes:"
git remote -v
echo ""

echo "📝 Step 1: Create Azure DevOps Repository"
echo "========================================"
echo "1. Go to: https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT"
echo "2. Click 'Repos' → 'Files'"
echo "3. Click 'Import a repository'"
echo "4. Select 'Import from GitHub'"
echo "5. Enter: https://github.com/RudrakshSingh/etelios.git"
echo "6. Repository name: $AZURE_DEVOPS_REPO"
echo "7. Click 'Import'"
echo ""

echo "🔑 Step 2: Generate Personal Access Token"
echo "========================================"
echo "1. Go to: https://dev.azure.com/$AZURE_DEVOPS_ORG/_usersSettings/tokens"
echo "2. Click 'New Token'"
echo "3. Name: 'GitHub Actions Integration'"
echo "4. Organization: $AZURE_DEVOPS_ORG"
echo "5. Expiration: 1 year"
echo "6. Scopes: ✅ All scopes (Full access)"
echo "7. Click 'Create'"
echo "8. Copy the token (save it securely!)"
echo ""

echo "🚀 Step 3: Push to Azure DevOps"
echo "==============================="
echo "After creating the repository and getting the token, run:"
echo ""
echo "git remote remove azure"
echo "git remote add azure https://$AZURE_DEVOPS_ORG:<YOUR_TOKEN>@dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_git/$AZURE_DEVOPS_REPO"
echo "git push azure main --force"
echo ""

echo "🔧 Alternative Method (if above fails):"
echo "======================================="
echo "1. Use Azure CLI:"
echo "   az login"
echo "   az repos create --name $AZURE_DEVOPS_REPO --project $AZURE_DEVOPS_PROJECT --organization https://dev.azure.com/$AZURE_DEVOPS_ORG"
echo ""
echo "2. Then push:"
echo "   git push azure main"
echo ""

echo "📊 Step 4: Verify Success"
echo "========================"
echo "1. Check Azure DevOps repository:"
echo "   https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_git/$AZURE_DEVOPS_REPO"
echo ""
echo "2. Check GitHub Actions:"
echo "   https://github.com/RudrakshSingh/etelios/actions"
echo ""

echo "🎯 Step 5: Set Up Pipeline"
echo "========================"
echo "1. Go to Azure DevOps Pipelines:"
echo "   https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_build"
echo ""
echo "2. Create New Pipeline:"
echo "   - Click 'New Pipeline'"
echo "   - Select 'Azure Repos Git'"
echo "   - Choose your repository"
echo "   - Select 'Node.js with Express'"
echo "   - Use the azure-pipelines.yml file"
echo ""

echo "✅ Success Checklist:"
echo "===================="
echo "[ ] Azure DevOps repository created"
echo "[ ] Personal Access Token generated"
echo "[ ] Code pushed to Azure DevOps"
echo "[ ] Azure DevOps pipeline created"
echo "[ ] GitHub Actions configured"
echo "[ ] Complete CI/CD pipeline working"
echo ""

echo "📚 For detailed setup, see:"
echo "- AZURE-DEVOPS-SETUP-GUIDE.md"
echo "- AZURE-DEVOPS-QUICK-FIX.md"
echo ""

echo "🚨 If you're still having issues:"
echo "1. Make sure the Azure DevOps repository exists"
echo "2. Check that your PAT has the right permissions"
echo "3. Verify the repository URL is correct"
echo "4. Try the alternative methods above"
