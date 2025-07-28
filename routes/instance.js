const express = require('express');
const router = express.Router();
const { criarInstancia, conectarInstancia } = require('../services/uazapi');

router.post('/init', async (req, res) => {
  try {
    const { nome } = req.body;
    const resposta = await criarInstancia(nome);
    res.json(resposta);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/connect', async (req, res) => {
  try {
    const { token } = req.body;
    const resposta = await conectarInstancia(token);
    res.json(resposta);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
