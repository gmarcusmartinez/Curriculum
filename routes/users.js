const express = require('express')
const bcrypt = require('bcryptjs')
const auth = require('../utils/auth')
const User = require('../models/User')
const userValidation = require('../validation/user')
const loginValidation = require('../validation/login')
const { OAuth2Client } = require('google-auth-library')
const { createToken, hash } = require('../utils/index')
const { validationResult } = require('express-validator/check')

const router = express.Router()
/**
 * Register user
 */
router.post('/', userValidation, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  try {
    let user = await User.findOne({ email: req.body.email })

    if (user) {
      return res.status(400).json({ errors: [{ msg: 'Email not available.' }] })
    }

    user = new User(req.body)

    user.password = await hash(user.password)

    await user.save()
    const token = await createToken(user)
    res.send({ token })
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server Error')
  }
})
/**
 * Google Signup
 */
// router.post('/googleAuth', async (req, res) => {
//   const verifyGoogleToken = async token => {
//     try {
//       const ticket = await client.verifyIdToken({
//         idToken: token,
//         audience: process.env.OAUTH_CLIENT_ID
//       })
//     } catch (err) {
//       throw new Error('Error verifying Google Token', err.message)
//     }
//   }
// })
/**
 * Login user
 */
router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Unable to login.' }] })
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: 'Unable to login.' }] })
    }
    const token = await createToken(user)
    res.send({ token })
  } catch (err) {
    console.error(err.message)
  }
})
/**
 * Fetch all users
 */
router.get('/all', async (req, res) => {
  try {
    const users = await User.find()
    res.send(users)
  } catch (err) {
    console.error(err.message)
  }
})

/**
 * Delete user
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(400).json({
        errors: [{ msg: 'You must be authenticated to perform this action' }]
      })
    }
    if (req.user.id !== req.params.id) {
      return res.status(400).json({
        errors: [{ msg: 'You are not authorized to perform this action' }]
      })
    }
    await user.remove()
    res.send({ msg: 'User Removed' })
  } catch (err) {
    res.status(500).send(err.message)
  }
})

/**
 * Returns the currently logged in authenticated user
 */

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id }).select('-password')
    res.send(user)
  } catch (err) {
    res.status(500).send(err)
  }
})

module.exports = router
