const axios = require('axios');
const logger = require('./logger.service');

class LLMService {
  constructor() {
    this.baseURL = process.env.LLM_URL || 'http://localhost:8000';
    this.modelName = process.env.LLM_MODEL || 'llama-3-8b-instruct';
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Check if LLM server is running
      const healthCheck = await this.healthCheck();
      if (!healthCheck) {
        throw new Error('LLM server is not running');
      }

      this.isInitialized = true;
      logger.info('LLM service initialized successfully');
    } catch (error) {
      logger.error('LLM service initialization failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.status === 200;
    } catch (error) {
      logger.error('LLM health check failed:', error);
      return false;
    }
  }

  async generateResponse(prompt, context = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('LLM service not initialized');
      }

      const response = await axios.post(`${this.baseURL}/generate`, {
        prompt: prompt,
        context: context,
        model: this.modelName,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9
      });

      return response.data;
    } catch (error) {
      logger.error('LLM response generation failed:', error);
      throw error;
    }
  }

  async generateRolePlayScenario(scenarioType, difficulty = 'BEGINNER') {
    try {
      const prompt = this.buildScenarioPrompt(scenarioType, difficulty);
      const context = {
        scenario_type: scenarioType,
        difficulty: difficulty,
        company: 'Lenstrack',
        industry: 'Optical Retail'
      };

      const response = await this.generateResponse(prompt, context);
      return this.parseScenarioResponse(response);
    } catch (error) {
      logger.error('Failed to generate role-play scenario:', error);
      throw error;
    }
  }

  buildScenarioPrompt(scenarioType, difficulty) {
    const basePrompt = `You are a training AI for Lenstrack, an optical retail company. Generate a realistic customer scenario for ${scenarioType} training at ${difficulty} level.

Scenario Requirements:
- Customer persona with specific needs and preferences
- Realistic objections and concerns
- Appropriate difficulty level
- Clear learning objectives
- Authentic dialogue examples

Generate a JSON response with:
{
  "customer_persona": {
    "name": "Customer Name",
    "age": "Age range",
    "occupation": "Job/role",
    "lifestyle": "Daily activities",
    "vision_needs": "Specific vision requirements",
    "budget_range": "Price sensitivity",
    "personality": "Communication style"
  },
  "scenario": {
    "situation": "What brings them in",
    "initial_concerns": ["List of concerns"],
    "objections": ["Potential objections"],
    "success_criteria": ["What success looks like"]
  },
  "learning_objectives": ["Specific skills to practice"],
  "difficulty_indicators": ["What makes this challenging"]
}`;

    return basePrompt;
  }

  parseScenarioResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      logger.error('Failed to parse scenario response:', error);
      // Return a fallback scenario
      return this.getFallbackScenario();
    }
  }

  getFallbackScenario() {
    return {
      customer_persona: {
        name: "Rajesh Kumar",
        age: "35-40",
        occupation: "Software Engineer",
        lifestyle: "Screen-heavy work, occasional outdoor activities",
        vision_needs: "Computer work, driving, reading",
        budget_range: "Mid-range",
        personality: "Analytical, asks many questions"
      },
      scenario: {
        situation: "First-time progressive lens user",
        initial_concerns: ["Adaptation period", "Cost", "Quality"],
        objections: ["Too expensive", "Need to think about it", "Worried about adaptation"],
        success_criteria: ["Clear explanation of benefits", "Address concerns", "Build confidence"]
      },
      learning_objectives: [
        "Explain progressive lens benefits",
        "Handle price objections",
        "Provide adaptation counseling"
      ],
      difficulty_indicators: [
        "Technical knowledge required",
        "Multiple objections to handle",
        "Need for empathy and reassurance"
      ]
    };
  }

  async generateFeedback(performance, rubric) {
    try {
      const prompt = this.buildFeedbackPrompt(performance, rubric);
      const context = {
        performance: performance,
        rubric: rubric,
        company: 'Lenstrack'
      };

      const response = await this.generateResponse(prompt, context);
      return this.parseFeedbackResponse(response);
    } catch (error) {
      logger.error('Failed to generate feedback:', error);
      throw error;
    }
  }

  buildFeedbackPrompt(performance, rubric) {
    return `You are a training coach for Lenstrack. Provide constructive feedback based on the following performance:

Performance Data:
${JSON.stringify(performance, null, 2)}

Rubric Criteria:
${JSON.stringify(rubric, null, 2)}

Generate feedback that:
1. Acknowledges strengths
2. Identifies specific areas for improvement
3. Provides actionable suggestions
4. Maintains a supportive tone
5. Focuses on Lenstrack's values and standards

Format as JSON:
{
  "overall_score": "X/12",
  "strengths": ["List of strengths"],
  "improvements": ["Specific areas to improve"],
  "suggestions": ["Actionable advice"],
  "next_steps": ["Recommended actions"]
}`;
  }

  parseFeedbackResponse(response) {
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in feedback response');
    } catch (error) {
      logger.error('Failed to parse feedback response:', error);
      return this.getFallbackFeedback();
    }
  }

  getFallbackFeedback() {
    return {
      overall_score: "8/12",
      strengths: [
        "Good product knowledge",
        "Professional demeanor"
      ],
      improvements: [
        "Ask more discovery questions",
        "Handle objections more effectively"
      ],
      suggestions: [
        "Practice the 7-step retail flow",
        "Use the objection handling framework"
      ],
      next_steps: [
        "Review the objection handling module",
        "Practice with more scenarios"
      ]
    };
  }

  async generateQuizQuestions(lessonContent, difficulty = 'BEGINNER') {
    try {
      const prompt = this.buildQuizPrompt(lessonContent, difficulty);
      const context = {
        lesson_content: lessonContent,
        difficulty: difficulty,
        company: 'Lenstrack'
      };

      const response = await this.generateResponse(prompt, context);
      return this.parseQuizResponse(response);
    } catch (error) {
      logger.error('Failed to generate quiz questions:', error);
      throw error;
    }
  }

  buildQuizPrompt(lessonContent, difficulty) {
    return `Generate quiz questions for a Lenstrack training lesson:

Lesson Content:
${JSON.stringify(lessonContent, null, 2)}

Difficulty Level: ${difficulty}

Generate 3-5 multiple choice questions that:
1. Test understanding of key concepts
2. Are appropriate for the difficulty level
3. Include realistic scenarios
4. Have clear correct answers
5. Include explanations

Format as JSON:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "Why this is correct"
    }
  ]
}`;
  }

  parseQuizResponse(response) {
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in quiz response');
    } catch (error) {
      logger.error('Failed to parse quiz response:', error);
      return this.getFallbackQuiz();
    }
  }

  getFallbackQuiz() {
    return {
      questions: [
        {
          question: "What is the first step in the 7-step retail flow?",
          options: ["Greet", "Probe", "Demonstrate", "Recommend"],
          correct_answer: 0,
          explanation: "Greeting the customer is the first step to establish rapport."
        },
        {
          question: "Which coating is best for computer work?",
          options: ["AR", "BlueCut", "Drive", "Photo"],
          correct_answer: 1,
          explanation: "BlueCut coating filters blue light from screens."
        }
      ]
    };
  }

  async generateContentSummary(content) {
    try {
      const prompt = `Summarize the following training content for Lenstrack:

${JSON.stringify(content, null, 2)}

Provide a concise summary that highlights:
1. Key learning points
2. Practical applications
3. Important reminders

Keep it under 200 words and use simple language.`;

      const response = await this.generateResponse(prompt);
      return response.text;
    } catch (error) {
      logger.error('Failed to generate content summary:', error);
      return "Content summary unavailable. Please review the lesson materials.";
    }
  }
}

module.exports = new LLMService();
