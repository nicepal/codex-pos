const Joi = require('joi');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      const { ValidationError } = require('../shared/errors');
      return next(new ValidationError('Validation failed', details));
    }

    req[source] = value;
    next();
  };
}

module.exports = { validate, Joi };
