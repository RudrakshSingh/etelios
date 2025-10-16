const axios = require('axios');
const logger = require('./logger.service');

class RasaService {
  constructor() {
    this.baseURL = process.env.RASA_URL || 'http://localhost:5005';
    this.modelName = process.env.RASA_MODEL || 'lenstrack_training';
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Check if Rasa server is running
      const healthCheck = await this.healthCheck();
      if (!healthCheck) {
        throw new Error('Rasa server is not running');
      }

      // Load the model
      await this.loadModel();
      
      this.isInitialized = true;
      logger.info('Rasa service initialized successfully');
    } catch (error) {
      logger.error('Rasa service initialization failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.status === 200;
    } catch (error) {
      logger.error('Rasa health check failed:', error);
      return false;
    }
  }

  async loadModel() {
    try {
      const response = await axios.post(`${this.baseURL}/model`, {
        model: this.modelName
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to load Rasa model:', error);
      throw error;
    }
  }

  async parseMessage(message, senderId, sessionId) {
    try {
      if (!this.isInitialized) {
        throw new Error('Rasa service not initialized');
      }

      const response = await axios.post(`${this.baseURL}/webhooks/rest/webhook`, {
        sender: senderId,
        message: message,
        session_id: sessionId
      });

      return response.data;
    } catch (error) {
      logger.error('Rasa message parsing failed:', error);
      throw error;
    }
  }

  async startConversation(sessionId, scenario) {
    try {
      const response = await axios.post(`${this.baseURL}/conversations/${sessionId}/trigger_intent`, {
        name: 'start_training_scenario',
        entities: {
          scenario: scenario
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to start Rasa conversation:', error);
      throw error;
    }
  }

  async endConversation(sessionId) {
    try {
      const response = await axios.post(`${this.baseURL}/conversations/${sessionId}/trigger_intent`, {
        name: 'end_training_scenario'
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to end Rasa conversation:', error);
      throw error;
    }
  }

  async getConversationHistory(sessionId) {
    try {
      const response = await axios.get(`${this.baseURL}/conversations/${sessionId}/tracker`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get conversation history:', error);
      throw error;
    }
  }

  async evaluatePerformance(sessionId, rubric) {
    try {
      const history = await this.getConversationHistory(sessionId);
      
      // Extract key performance indicators from conversation
      const performance = {
        discovery_questions: this.countDiscoveryQuestions(history),
        product_recommendations: this.countProductRecommendations(history),
        objection_handling: this.countObjectionHandling(history),
        closing_attempts: this.countClosingAttempts(history),
        compliance_mentions: this.countComplianceMentions(history),
        empathy_indicators: this.countEmpathyIndicators(history)
      };

      // Calculate scores based on rubric
      const scores = this.calculateRubricScores(performance, rubric);
      
      return {
        performance,
        scores,
        feedback: this.generateFeedback(scores, rubric)
      };
    } catch (error) {
      logger.error('Failed to evaluate performance:', error);
      throw error;
    }
  }

  countDiscoveryQuestions(history) {
    const discoveryKeywords = [
      'what', 'how', 'when', 'where', 'why', 'tell me', 'describe',
      'lifestyle', 'work', 'hobbies', 'activities', 'vision', 'comfort'
    ];
    
    return history.events
      .filter(event => event.event === 'user')
      .map(event => event.text.toLowerCase())
      .filter(text => discoveryKeywords.some(keyword => text.includes(keyword)))
      .length;
  }

  countProductRecommendations(history) {
    const productKeywords = [
      'recommend', 'suggest', 'perfect for', 'ideal', 'best choice',
      'frame', 'lens', 'coating', 'progressive', 'sunglasses'
    ];
    
    return history.events
      .filter(event => event.event === 'bot')
      .map(event => event.text.toLowerCase())
      .filter(text => productKeywords.some(keyword => text.includes(keyword)))
      .length;
  }

  countObjectionHandling(history) {
    const objectionKeywords = [
      'price', 'expensive', 'cost', 'budget', 'afford', 'cheaper',
      'think', 'consider', 'discuss', 'spouse', 'family'
    ];
    
    return history.events
      .filter(event => event.event === 'user')
      .map(event => event.text.toLowerCase())
      .filter(text => objectionKeywords.some(keyword => text.includes(keyword)))
      .length;
  }

  countClosingAttempts(history) {
    const closingKeywords = [
      'purchase', 'buy', 'order', 'proceed', 'move forward', 'next step',
      'payment', 'checkout', 'finalize', 'confirm'
    ];
    
    return history.events
      .filter(event => event.event === 'bot')
      .map(event => event.text.toLowerCase())
      .filter(text => closingKeywords.some(keyword => text.includes(keyword)))
      .length;
  }

  countComplianceMentions(history) {
    const complianceKeywords = [
      'terms', 'conditions', 'policy', 'warranty', 'return', 'exchange',
      'guarantee', 'certification', 'standard', 'procedure'
    ];
    
    return history.events
      .filter(event => event.event === 'bot')
      .map(event => event.text.toLowerCase())
      .filter(text => complianceKeywords.some(keyword => text.includes(keyword)))
      .length;
  }

  countEmpathyIndicators(history) {
    const empathyKeywords = [
      'understand', 'appreciate', 'feel', 'concern', 'worry', 'comfort',
      'help', 'support', 'assist', 'care', 'listen', 'hear'
    ];
    
    return history.events
      .filter(event => event.event === 'bot')
      .map(event => event.text.toLowerCase())
      .filter(text => empathyKeywords.some(keyword => text.includes(keyword)))
      .length;
  }

  calculateRubricScores(performance, rubric) {
    const scores = {};
    
    // Discovery score (0-2)
    scores.discovery = Math.min(2, performance.discovery_questions / 3);
    
    // Product fit score (0-2)
    scores.product_fit = Math.min(2, performance.product_recommendations / 2);
    
    // Clarity score (0-2)
    scores.clarity = Math.min(2, (performance.discovery_questions + performance.product_recommendations) / 4);
    
    // Empathy score (0-2)
    scores.empathy = Math.min(2, performance.empathy_indicators / 2);
    
    // Compliance score (0-2)
    scores.compliance = Math.min(2, performance.compliance_mentions / 1);
    
    // Close score (0-2)
    scores.close = Math.min(2, performance.closing_attempts / 1);
    
    return scores;
  }

  generateFeedback(scores, rubric) {
    const feedback = [];
    
    Object.entries(scores).forEach(([dimension, score]) => {
      const weight = rubric[dimension]?.weight || 0;
      const criteria = rubric[dimension]?.criteria || '';
      
      if (score >= 1.5) {
        feedback.push(`✅ ${dimension}: Excellent (${score.toFixed(1)}/2) - ${criteria}`);
      } else if (score >= 1.0) {
        feedback.push(`⚠️ ${dimension}: Good (${score.toFixed(1)}/2) - ${criteria}`);
      } else {
        feedback.push(`❌ ${dimension}: Needs improvement (${score.toFixed(1)}/2) - ${criteria}`);
      }
    });
    
    return feedback;
  }

  async createTrainingScenario(scenarioData) {
    try {
      const response = await axios.post(`${this.baseURL}/conversations/training/trigger_intent`, {
        name: 'create_training_scenario',
        entities: scenarioData
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create training scenario:', error);
      throw error;
    }
  }

  async getAvailableScenarios() {
    try {
      const response = await axios.get(`${this.baseURL}/scenarios`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get available scenarios:', error);
      throw error;
    }
  }
}

module.exports = new RasaService();
