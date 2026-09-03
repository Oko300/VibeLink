import express from 'express';
import passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import jwt from 'jsonwebtoken';

const router = express.Router();

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: process.env.API_URL + '/auth/x/callback',
    includeEmail: false // X API doesn't always provide email
  },
  function(token, tokenSecret, profile, cb) {
    // In a real app, you would find or create a user in your database
    // For this example, we'll just return a simplified profile
    const userProfile = {
      username: profile.username,
      displayName: profile.displayName,
      profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
      id: profile.id
    };
    return cb(null, userProfile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

router.get('/x',
  passport.authenticate('twitter'));

router.get('/x/callback',
  passport.authenticate('twitter', { failureRedirect: process.env.CLIENT_URL + '/?error=auth_failed' }),
  function(req, res) {
    // Successful authentication, generate JWT
    const user = req.user;
    const payload = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      profilePicture: user.profilePicture,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    res.redirect(process.env.CLIENT_URL + '/auth/callback?token=' + token);
  });

export default router;