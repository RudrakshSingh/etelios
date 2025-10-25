#!/bin/bash

# Azure DevOps Push Script
# This script helps push code to Azure DevOps repository

set -e

echo "🚀 Azure DevOps Push Script"
echo "=========================="

# Configuration
AZURE_DEVOPS_ORG="Hindempire-devops1"
AZURE_DEVOPS_PROJECT="etelios"
AZURE_DEVOPS_REPO="etelios"
AZURE_DEVOPS_URL="https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_git/$AZURE_DEVOPS_REPO"

echo "📋 Configuration:"
echo "  Organization: $AZURE_DEVOPS_ORG"
echo "  Project: $AZURE_DEVOPS_PROJECT"
echo "  Repository: $AZURE_DEVOPS_REPO"
echo "  URL: $AZURE_DEVOPS_URL"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not initialized. Initializing..."
    git init
    git add .
    git commit -m "Initial commit"
fi

# Check current remotes
echo "🔍 Current remotes:"
git remote -v
echo ""

# Add Azure DevOps remote
echo "🔗 Adding Azure DevOps remote..."
git remote add azure $AZURE_DEVOPS_URL 2>/dev/null || echo "Remote already exists"

# Check if we have changes to commit
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Push to Azure DevOps
echo "🚀 Pushing to Azure DevOps..."
echo "This will require authentication with your Azure DevOps Personal Access Token"
echo ""

# Method 1: Try with stored credentials
echo "Attempting push with stored credentials..."
if git push azure main --force; then
    echo "✅ Successfully pushed to Azure DevOps!"
else
    echo "❌ Push failed. Trying alternative methods..."
    
    # Method 2: Interactive push
    echo "Please enter your Azure DevOps Personal Access Token when prompted:"
    echo "You can get this from: https://dev.azure.com/$AZURE_DEVOPS_ORG/_usersSettings/tokens"
    echo ""
    
    # Update remote URL with token placeholder
    git remote set-url azure https://$AZURE_DEVOPS_ORG@dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_git/$AZURE_DEVOPS_REPO
    
    # Try push again
    if git push azure main --force; then
        echo "✅ Successfully pushed to Azure DevOps!"
    else
        echo "❌ Push still failed. Please check:"
        echo "1. Your Personal Access Token is valid"
        echo "2. You have write permissions to the repository"
        echo "3. The repository exists in Azure DevOps"
        echo ""
        echo "Manual steps:"
        echo "1. Go to: https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT"
        echo "2. Create a new repository named '$AZURE_DEVOPS_REPO'"
        echo "3. Get the repository URL and update the remote"
        echo "4. Try pushing again"
    fi
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Verify the code is in Azure DevOps repository"
echo "2. Set up Azure DevOps pipeline"
echo "3. Configure deployment to Azure App Service"
echo "4. Set up monitoring and alerts"
echo ""
echo "📚 For detailed setup, see: AZURE-DEVOPS-SETUP-GUIDE.md"
