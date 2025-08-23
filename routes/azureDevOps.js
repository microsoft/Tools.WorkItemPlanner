const express = require('express');
const axios = require('axios');
const router = express.Router();

const baseUrl = 'https://dev.azure.com/';

// API endpoint to retrieve user profile
router.get('/api/:organization/user/profile/:userId', async (req, res) => {
  const organization = req.params.organization;
  const userId = req.params.userId;
  const userUrl = `${baseUrl}${organization}/_apis/identities?ids=${userId}&api-version=7.1`;

  try {
    const userResponse = await axios.get(userUrl);
    const userProfile = userResponse.data.value[0];
    res.json(userProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// API endpoint to fetch teams for a given organization and project
router.get('/api/azure-devops/:organization/projects/:project/teams/', async (req, res) => {
  const organization = req.params.organization;
  const project = req.params.project;
  const teamsUrl = `${baseUrl}${organization}/${project}/_apis/teams?api-version=7.0&$mine=true`;

  try {
    const teamsResponse = await axios.get(teamsUrl);
    const teams = teamsResponse.data.value;
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

// API endpoint to fetch iterations for a given team
router.get('/api/:organization/azure-devops/iterations/:project/:teamId', async (req, res) => {
  const organization = req.params.organization;
  const project = req.params.project;
  const teamId = req.params.teamId;
  const iterationsUrl = `${baseUrl}${organization}/${project}/${teamId}/_apis/work/teamsettings/iterations?api-version=7.1`;

  try {
    const iterationsResponse = await axios.get(iterationsUrl);
    const iterations = iterationsResponse.data.value;
    res.json(iterations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch iterations.' });
  }
});

// API endpoint to fetch area paths for a given team
router.get('/api/:organization/azure-devops/areapaths/:project/:teamId', async (req, res) => {
  const organization = req.params.organization;
  const project = req.params.project;
  const teamId = req.params.teamId;
  const areaPathsUrl = `${baseUrl}${organization}/${project}/${teamId}/_apis/wit/classificationnodes?$depth=2&api-version=7.1`;

  try {
    const areaPathsResponse = await axios.get(areaPathsUrl);
    const areaPaths = areaPathsResponse.data.value;
    res.json(areaPaths);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch area paths.' });
  }
});

// API endpoint to fetch user avatar
router.get('/api/:organization/avatar/:userId', async (req, res) => {
  const organization = req.params.organization;
  const userId = req.params.userId;
  const size = req.query.size || '2';
  const format = req.query.format || 'png';
  
  // Use the correct Graph API endpoint for avatars with subject descriptor
  // Note: userId here is actually the subject descriptor from Azure DevOps
  const avatarUrl = `https://vssps.dev.azure.com/${organization}/_apis/graph/Subjects/${userId}/avatars?size=${size}&format=${format}&api-version=7.1`;

  console.log(`[Avatar Backend] === Avatar Request Started ===`);
  console.log(`[Avatar Backend] Organization: ${organization}`);
  console.log(`[Avatar Backend] User/Subject ID: ${userId}`);
  console.log(`[Avatar Backend] Avatar URL: ${avatarUrl}`);

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.authorization;
    console.log(`[Avatar Backend] Received request for user ${userId} in org ${organization}`);
    console.log(`[Avatar Backend] Received auth header:`, authHeader ? `${authHeader.substring(0, 30)}...` : 'NONE');
    
    if (!authHeader) {
      console.log(`[Avatar Backend] No authorization header provided`);
      return res.status(401).json({ error: 'Authorization header required' });
    }

    console.log(`[Avatar Backend] Fetching avatar from: ${avatarUrl}`);
    
    // Add more detailed headers for debugging
    const requestHeaders = {
      'Authorization': authHeader,
      'User-Agent': 'WorkItemPlanner/1.0',
      'Accept': 'image/png,image/jpeg,image/*'
    };
    console.log(`[Avatar Backend] Request headers:`, requestHeaders);
    
    const avatarResponse = await axios.get(avatarUrl, {
      headers: requestHeaders,
      responseType: 'arraybuffer', // Important: get binary data
      timeout: 10000 // 10 second timeout
    });

    console.log(`[Avatar Backend] Successfully fetched avatar, status: ${avatarResponse.status}`);
    console.log(`[Avatar Backend] Content-type: ${avatarResponse.headers['content-type']}`);
    console.log(`[Avatar Backend] Content-length: ${avatarResponse.headers['content-length']}`);
    
    // Set appropriate headers
    res.set({
      'Content-Type': avatarResponse.headers['content-type'] || 'image/png',
      'Content-Length': avatarResponse.headers['content-length'],
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    // Send the image data
    res.send(avatarResponse.data);
  } catch (error) {
    console.error(`[Avatar Backend] Avatar fetch error for ${userId}:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
      data: error.response?.data ? error.response.data.toString().substring(0, 200) : 'No data'
    });
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      console.error(`[Avatar Backend] Authentication failed - check token permissions for Graph API`);
    }
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch avatar',
      details: error.message,
      status: error.response?.status 
    });
  }
});

module.exports = router;