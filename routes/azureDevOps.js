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

module.exports = router;