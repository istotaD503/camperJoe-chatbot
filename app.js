'use strict';
const builder = require('botbuilder');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;
const app = express();
const chalk = require('chalk');
const { newsDefault } = require('./utils');
const here = chalk.red('HERE ==>');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(morgan('dev'));

app.use((err, req, res, next) => {
  console.error(err);
  console.error(err.stack);
  res.status(err.status || 500).send(err.message || 'Internal server error.');
});

app.listen(PORT, () => {
  console.log(`App is listening on the port ${PORT}`);
});

const connector = new builder.ChatConnector({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword
});

app.post('/api/messages', connector.listen());

var inMemoryStorage = new builder.MemoryBotStorage();
const optionsJoe = 'Planning a trip | News about camping';

const bot = new builder.UniversalBot(connector, [
  session => session.beginDialog('greeting')
]).set('storage', inMemoryStorage);

bot.dialog('greeting', [
  session => {
    session.send(`Hi, I'm Joe and I'm camping expert! <br> `);
    session.send(
      `I can help you to plan your trip or tell you other interesting info about camping.`
    );
    session.endDialog(`Please say: 'plan a trip' or 'read news'.`);
  }
]);

bot
  .dialog('options', (session, args, next) => {
    builder.Prompts.choice(
      session,
      `I can help you to:`,
      `plan a trip|read news`,
      { listStyle: 3 }
    );
    session.endDialog();
  })
  .triggerAction({
    matches: /^help$/i
  });

bot
  .dialog('readNews', [
    session => {
      session.send(`Sounds good, let me find smth cool for you!`);
      builder.Prompts.text(
        session,
        `You can tell me the topic or just say 'latest'`
      );
    },
    (session, results) => {
      let searchTerm =
        results.response == `latest`
          ? 'Outdoors adventure news'
          : results.response;
      newsDefault(session, searchTerm);
    }
  ])
  .triggerAction({
    matches: /^read news$/i,
    confirmPrompt: 'This will cancel your current request. Are you sure?'
  });

bot
  .dialog('tripPlan', [
    session => {
      session.send(`OK, let's plan!`);
      session.beginDialog('askForDate');
    },
    (session, results) => {
      session.dialogData.date = results.response.date;
      session.beginDialog('askForDuration');
    },
    (session, results) => {
      session.dialogData.numOfNights = results.response;
      session.beginDialog('askForPlace');
    },
    (session, results) => {
      let dialog = results.response.index ? 'searchForCamp' : 'searchClosest';
      session.beginDialog(dialog);
    },
    (session, results) => {
      session.dialogData.place = results.response;
      session.endDialog('OK, your trip is saved!');
    }
  ])
  .triggerAction({
    matches: /^plan a trip$/i,
    confirmPrompt: 'This will cancel your current request. Are you sure?'
  });

// local help to find a place!

bot.dialog('askForDuration', [
  session =>
    builder.Prompts.number(
      session,
      'How many nights are you planning to stay?'
    ),
  (session, results) => {
    let numOfNights = results.response;
    session.send(`Perfect! You'll be camping for ${numOfNights} nights.`);
    session.endDialogWithResult(results);
  }
]);

bot.dialog('askForDate', [
  session =>
    builder.Prompts.time(session, 'When are you planning to go camping?'),
  (session, results) => {
    let date = builder.EntityRecognizer.resolveTime([results.response]);
    session.send(`${date}, sounds good!`);
    results.response.date = date;
    session.endDialogWithResult(results);
  }
]);

bot.dialog('locationHelp', [
  session =>
    builder.Prompts.choice(
      session,
      'Sure! Do you want me to pick something close by?',
      'Help me pick | I have and idea!',
      { listStyle: 3 }
    ),
  (session, results) => {
    let msg = results.response.index
      ? `Wonderful! Let me know and I'll help you to book a campground nearby <br> or search for activities`
      : `OK, no problem! Give me some time, I'll search for something good...`;
    session.send(msg);
    session.endDialogWithResult(results);
  }
]);

bot.dialog('searchForCamp', [
  session => {
    session.send('Searching..');
  }
]);

bot.dialog('searchClosest', [
  session => {
    session.send('Searching for closest...');
  }
]);

bot
  .dialog('askForPlace', [
    session => {
        builder.Prompts.text(session, `Do you know where you want to go?`);
    },
    (session, results) => session.endDialogWithResult(results)
  ])
  .beginDialogAction('helpWithLocation', 'locationHelp', {
    matches: /^help me$/i
  });
