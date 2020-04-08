const crypto = require("crypto");
const User = require("../models/User");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");
const sendEmail = require("../utils/sendEmail");

exports.me = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    user,
  });
});

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ name, email, password, role });

  const token = user.getSignedJwtToken();
  res.status(200).json({ token });
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorResponse("Please provide email and password.", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorResponse("Invalid credentials.", 401));
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials.", 401));
  }

  sendTokenResponse(user, 200, res);
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse("Account not found", 404));
  }
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/resetpassword/${resetToken}`;

  const message = `You are recieving this email because you have requested the reset of a pasword. Please make a Put request to \n\n ${resetUrl}`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Reset Password",
      message,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err.message);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse("Email could not be sent", 500));
  }
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gte: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse("Invalid Token", 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendTokenResponse(user, 200, res);
});

exports.updateDetails = asyncHandler(async (req, res, next) => {
  const { name, email } = req.body;
  const fieldsToUpdate = {
    name,
    email,
  };
  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    success: true,
    data: user,
  });
});

// exports.updatePassword = asyncHandler(async (req, res, next) => {
//   const user = await findById(req.user.id).select("+password");

//   if (!(await user.matchPassword(req.body.currentPassword))) {
//     return next(new ErrorResponse("Invalid credentials", 401));
//   }

//   user.password = req.body.newPassword;
//   await user.save();

//   sendTokenResponse(user, 200, res);
// });

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }
  res.status(statusCode).cookie("token", token, options).json({ token });
};
