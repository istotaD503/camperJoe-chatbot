'use strict';
const builder = require('botbuilder');
const Bing = require('node-bing-api')({ accKey: "7492a8423e1144be9570fab77f63260c" });
const util = require('util');
const searchBing = util.promisify(Bing.news.bind(Bing));

const cropTitle = title => {
    let spaceCount = 0;
    for(var i = 0; i < title.length; i++) {
      if(title[i] === ' ') {
        spaceCount++
      }
      if(spaceCount === 4) {
        break;
      }
    }
    return {
      title : `${title.slice(0, i)}...`,
      sub : `...${title.slice(i+1)}`
    }
  }


// will convert this to promise and parse the body!
const newsCarousel = (news, session) => {
    if(news) {
    let msg = new builder.Message(session);
    let attachments = news.map(each => {
        let name = cropTitle(each.name),
        title = name.title,
        sub = name.sub;

        return new builder.ThumbnailCard(session)
        .title(title)
        .subtitle(sub)
        .text(each.description)
        .images([
            { url : each.image.thumbnail.contentUrl }
        ])
        .buttons([
            { title : 'Read',
            value : each.url
            }
        ])
    })
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    msg.attachments(attachments)
    session.send(msg).endDialog()
    } else {
        session.endDialog(`Sorry Bing isn't responding. Try again later`)
    }
}

const newsDefault = (session, searchTerm) => {
    Bing.news(searchTerm, { count: 5 }, (err, res, body) => {
        if(err) {
            console.error(err)
        }
        console.log(body.value)
        newsCarousel(body.value, session)
      });
}

module.exports = {newsDefault, newsCarousel}