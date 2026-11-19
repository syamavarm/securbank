// Brand Concierge Web Client styling for the HDFC test page.
// index.html passes window.styleConfiguration; the documented name is
// window.styleConfigurations, so both point at the same object.
window.styleConfiguration = {
  metadata: {
    brandName: 'HDFC Bank',
    version: '1.0.0',
    language: 'en-US',
    namespace: 'brand-concierge',
  },
  behavior: {
    input: {
      enableVoiceInput: false,
    },
    chat: {
      messageAlignment: 'left',
      messageWidth: '80%',
    },
    privacyNotice: {
      title: 'Privacy Notice',
      text: 'This is a test assistant. Please do not enter real personal or financial information (PAN, account numbers, OTPs) in the chat.',
    },
    disclaimer: {
      attachWithInput: true,
    },
    chatTranscript: {
      enabled: false,
    },
  },
  disclaimer: {
    text: 'AI responses may be inaccurate or misleading. Be sure to double check answers and sources.',
  },
  text: {
    'welcome.heading': 'Welcome to HDFC Bank',
    'welcome.subheading': 'Ask about our products, or start a personal loan application.',
    'input.placeholder': 'Ask me anything about HDFC Bank',
  },
  arrays: {
    'welcome.examples': [
      { text: 'I want to apply for a personal loan', backgroundColor: '#E6EEF6' },
      { text: 'What are the personal loan interest rates?', backgroundColor: '#E6EEF6' },
      { text: 'How do I open a savings account?', backgroundColor: '#E6EEF6' },
    ],
  },
  theme: {
    '--color-primary': '#004C8F',
    '--color-primary-hover': '#003A6E',
    '--color-button-primary': '#004C8F',
    '--color-accent': '#ED232A',
    '--color-button-submit': '#004C8F',
    '--color-button-submit-hover': '#003A6E',
    '--color-message-user': '#004C8F',
    '--font-family': "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    '--main-container-background': '#FFFFFF',
    '--submit-button-fill-color': 'white',
    '--message-concierge-link-decoration': 'underline',
    '--message-max-width': '100%',
  },
};
window.styleConfigurations = window.styleConfiguration;
