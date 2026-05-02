import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import passport from 'passport';

import indexRouter from './routes/index';
import usersRouter from './routes/users';
import memberRouter from './routes/api/member';
import representativesRouter from './routes/api/representatives';
import billRouter from './routes/api/bill';
import authRouter from './routes/api/auth';
import votesRouter from './routes/api/votes';
import authMiddleware from './middleware/auth';

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(authMiddleware);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/member', memberRouter);
app.use('/api/bill', billRouter);
app.use('/api/votes', votesRouter);
app.use('/find-representative-and-senator', representativesRouter);

export default app;
