const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/public", express.static(process.cwd() + "/public"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String,
  userId: String
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.post("/api/users", async function (req, res) {
  try {
    const username = req.body.username;

    const user = new User({
      username: username
    });

    const savedUser = await user.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/api/users", async function (req, res) {
  try {
    const users = await User.find();

    res.json(
      users.map(function (user) {
        return {
          username: user.username,
          _id: user._id
        };
      })
    );
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/api/users/:_id/exercises", async function (req, res) {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const description = req.body.description;
    const duration = Number(req.body.duration);

    let date;

    if (req.body.date) {
      date = new Date(req.body.date);
    } else {
      date = new Date();
    }

    const exercise = new Exercise({
      username: user.username,
      description: description,
      duration: duration,
      date: date.toDateString(),
      userId: user._id.toString()
    });

    const savedExercise = await exercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date,
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/api/users/:_id/logs", async function (req, res) {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const query = {
      userId: user._id.toString()
    };

    if (req.query.from || req.query.to) {
      query.date = {};

      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        query.date.$gte = fromDate.toDateString();
      }

      if (req.query.to) {
        const toDate = new Date(req.query.to);
        query.date.$lte = toDate.toDateString();
      }
    }

    let exercises = await Exercise.find(query);

    if (req.query.from || req.query.to) {
      const fromTime = req.query.from
        ? new Date(req.query.from).getTime()
        : null;

      const toTime = req.query.to
        ? new Date(req.query.to).getTime()
        : null;

      exercises = exercises.filter(function (exercise) {
        const exerciseTime = new Date(exercise.date).getTime();

        if (fromTime && exerciseTime < fromTime) {
          return false;
        }

        if (toTime && exerciseTime > toTime) {
          return false;
        }

        return true;
      });
    }

    if (req.query.limit) {
      exercises = exercises.slice(0, Number(req.query.limit));
    }

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(function (exercise) {
        return {
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date
        };
      })
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log("Your app is listening on port " + port);
});