const path = require('path');

module.exports = {
  entry: './public/main.js',  // Ensure this is the correct path
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
  },
  mode: 'development', // Switch to 'production' when ready
};
