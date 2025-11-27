const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  labName: {
    type: String,
    required: true,
    trim: true
  },
  mrLink: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https:\/\/gitlab\.com\/[\w\-\.\/]+\/-\/merge_requests\/\d+/.test(v) ||
               /^https:\/\/gitlab\.[\w\-\.]+\/[\w\-\.\/]+\/-\/merge_requests\/\d+/.test(v);
      },
      message: 'Некорректная ссылка на GitLab Merge Request'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Submission', submissionSchema);

