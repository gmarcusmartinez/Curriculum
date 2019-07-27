const express = require('express')
const auth = require('../utils/auth')
const Itinerary = require('../models/Itinerary')
const itineraryValidation = require('../validation/itinerary')
const { validationResult } = require('express-validator/check')

const router = express.Router()

/**
 * Create Itinerary
 */
router.post('/', [auth, itineraryValidation], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  try {
    const user = req.user.id

    const itinerary = await new Itinerary(req.body)
    itinerary.user = user

    itinerary.save()
    res.send(itinerary)
  } catch (err) {
    res.status(500).send(err.message)
  }
})
/**
 * GET Itineraries by authenticated user
 */
router.get('/', auth, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ user: req.user.id })
    if (!itineraries) {
      return res.send({ msg: 'No itineraries found.' })
    }
    res.json(itineraries)
  } catch (err) {
    res.status(500).send(err.message)
  }
})
// Get Itinerary by id
router.get('/:id', async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
    if (!itinerary) {
      return res.status(400).json({ errors: [{ msg: 'Itinerary not found.' }] })
    }

    res.json(itinerary)
  } catch (err) {
    res.status(500).send(err.message)
  }
})
// Get Itinerary by city
router.get('/city/:cityName', async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ city: req.params.cityName })
    if (!itineraries) {
      return res.send({ msg: 'This city currently has no itineraries.' })
    }
    res.json(itineraries)
  } catch (err) {
    res.status(500).send(err.message)
  }
})

//Update Itinerary
router.patch('/:id', [auth, itineraryValidation], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  try {
    let itinerary = await Itinerary.findById(req.params.id)
    if (!itinerary) {
      return res.status(404).json({
        errors: [{ msg: 'Itinerary not found' }]
      })
    }
    if (req.user.id !== itinerary.user.toString()) {
      return res.status(400).json({
        errors: [{ msg: 'You are not authorized to perform this action' }]
      })
    }
    itinerary = await Itinerary.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })

    res.send(itinerary)
  } catch (err) {
    res.send(err.message)
  }
})

// Delete individual Itinerary from database
router.delete('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
    if (!itinerary) {
      return res.send({ msg: 'Itinerary not found.' })
    }
    if (req.user.id !== itinerary.user.toString()) {
      return res.status(400).json({
        errors: [{ msg: 'You are not authorized to perform this action' }]
      })
    }
    await itinerary.remove()
    res.json({ msg: 'Itinerary removed.' })
  } catch (err) {
    res.status(500).send(err.message)
  }
})
module.exports = router
