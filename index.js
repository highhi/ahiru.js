class Ahiru {
  constructor() {
    this.subscriptions = []; 
  }

  static fromEventHandlerSetter(obj, prop) {
    const stream = new Ahiru();
    obj[prop] = (event) => stream.publish(event);
    return stream;
  }

  static fromEventHandlerFunction(obj, ...funcNames) {
    const args = funcNames.slice(2);
    const stream = new Ahiru();

  }

  publish(message) {
    this.subscriptions.forEach(subscription => subscription(message));
    return this;
  }

  subscribe(subscription) {
    this.subscriptions.push(subscription);
    return this;
  }

  merge(stream) {
    const mergedStream = new Ahiru();
    this.subscribe(message => mergedStream.publish(message));
    stream.subscribe(message => mergedStream.publish(message));
    return mergedStream;
  }

  scan(seed, acc) {
    const accStream = new Ahiru();
    let prevMessage = seed;
    this.subscribe(message => {
      prevMessage = acc(prevMessage, message);
      accStream.publish(prevMessage);
    });
    return accStream;
  }

  filter(filterFunc) {
    const filteredStream = new Ahiru();
    this.subscribe(message => {
      if (!filterFunc(message)) return;
      filteredStream.publish(message)
    });

    return filteredStream;
  }

  map(mapFunc) {
    const mapStream = new Ahiru();
    this.subscribe(message => mapStream.publish(mapFunc(message)));
    return mapStream;
  }

  buffer(stream) {
    const bufferStream = new Ahiru();
    let bufferMessages = [];
    this.subscribe(message => bufferMessages.push(message));
    stream.subscribe(() => {
      bufferStream.publish(bufferMessages.slice());
      bufferMessages = [];
    });
    return bufferStream;
  }

  combine(stream, combiner)  {
    const combineStream = new Ahiru();
    let latestMessageOfThis;
    let latestMessageOfAnother;
    let hasAnyMessageOfThis = false;
    let hasAnyMessageOfAnother = false;
    this.subscribe(message => {
      latestMessageOfThis = message;
      hasAnyMessageOfThis = true;
      if (hasAnyMessageOfAnother) {
        combineStream.publish(combiner(latestMessageOfThis, latestMessageOfAnother));
      }
    });

    stream.subscribe(message => {
      latestMessageOfAnother = message;
      hasAnyMessageOfAnother = true;
      if (hasAnyMessageOfThis) {
        combineStream.publish(combiner(latestMessageOfThis, latestMessageOfAnother));
      }
    });

    return combineStream;
  }

  sampleBy(stream, combiner) {
    const sampleStream = new Ahiru();
    let latestMessageOfThis;
    let hasAnyMessageOfThis = false;

    this.subscribe(message => {
      latestMessageOfThis = message;
      hasAnyMessageOfThis = true;
    })

    stream.subscribe(message => {
      if (hasAnyMessageOfThis) {
        sampleStream.publish(combiner(latestMessageOfThis, message));
      }
    })
    return sampleStream;
  }

  flatMap(streamCreator) {
    const flattenStream = new Ahiru();
    this.subscribe(message => {
      streamCreator(message).subscribe(messageOnEachStream => {
        flattenStream.publish(messageOnEachStream);
      })
    })
    return flattenStream;
  }

  flatMapLatest(streamCreator) {
    const flattenStream = new Ahiru();
    let latestStream;
    this.subscribe(message => {
      const currentStream = streamCreator(message);
      latestStream = currentStream;
      latestStream.subscribe(messageOnEachStream => {
        if (currentStream !== latestStream) return;
        flattenStream.publish(messageOnEachStream);
      })
    })
    return flattenStream;
  }

  throttleWithCount(count) {
    const index = 0;
    return this.fileter(message => index++ % count === 0);
  }
}
