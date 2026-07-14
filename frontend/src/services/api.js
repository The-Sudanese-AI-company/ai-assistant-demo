import axios from 'axios';

/**
 * API Service for RAG Knowledge Assistant
 * Handles all communication with the backend Flask server
 */

// Use environment variable or default to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';


// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for RAG responses
});

/**
 * Sends a message to the RAG system
 * @param {string} question - The user's question
 * @param {Array} history - Conversation history
 * @param {boolean} showDetails - Whether to return retrieval details
 * @returns {Promise<Object>} Response with answer and optional details
 */
export const sendMessage = async (question, history, showDetails) => {
  try {
    const response = await api.post('/api/chat', {
      question,
      history,
      show_details: showDetails,
    });
    return response.data;
  } catch (error) {
    // Handle different error types
    if (error.response) {
      // Server responded with an error
      return { error: error.response.data.error || 'Server error' };
    } else if (error.request) {
      // Request was made but no response
      return { error: 'No response from server. Please check your connection.' };
    } else {
      // Something else happened
      return { error: error.message || 'Network error' };
    }
  }
};

/**
 * Health check for the backend
 * @returns {Promise<Object>} Health status
 */
export const healthCheck = async () => {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (error) {
    return { status: 'unhealthy' };
  }
};

const api_test =  {
  sendMessage,
  healthCheck,
};
export default api_test;
