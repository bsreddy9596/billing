const Joi = require("joi");

exports.createOrderValidation = Joi.object({
  customerId: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      type: Joi.string().valid("sofa", "bed", "table").required(),
      measurements: Joi.object({
        width: Joi.number().required(),
        height: Joi.number().required(),
        depth: Joi.number().required(),
      }),
      quantity: Joi.number().min(1).required(),
    })
  ),
});
