/*global expect, sinon, _currentUserData:true, currentConversation:true,
  UserData, browserPort:true, contactsDb, Conversation,
  currentUsers:true */
/* jshint expr:true */

describe("Conversation", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    browserPort = {
      postEvent: sandbox.spy()
    };
    contactsDb.options.dbname = "TalkillaContactsTest";
  });

  afterEach(function(done) {
    browserPort = undefined;
    currentConversation = undefined;
    sandbox.restore();
    contactsDb.drop(function() {
      done();
    });
  });

  describe("initialize", function() {
    it("should store the initial data", function() {
      var data = {
        peer: "florian"
      };

      currentConversation = new Conversation(data);

      expect(currentConversation.data).to.deep.equal(data);
    });

    it("should ask the browser to open a chat window", function() {
      currentConversation = new Conversation({});

      sinon.assert.calledOnce(browserPort.postEvent);
      sinon.assert.calledWithExactly(browserPort.postEvent,
                                     "social.request-chat", "chat.html");
    });
  });

  describe("#windowOpened", function() {
    var port, data;

    beforeEach(function() {
      // Avoid touching the contacts db which we haven't initialized.
      sandbox.stub(contactsDb, "add");
      _currentUserData = new UserData({_userName: "romain"});
      currentUsers = {
        florian: { presence: "connected" }
      };
      port = {
        postEvent: sandbox.spy()
      };
      data = {
        peer: "florian"
      };
    });

    afterEach(function() {
      _currentUserData = undefined;
      currentUsers = {};
      port = undefined;
    });

    it("should store the port", function() {
      currentConversation = new Conversation(data);

      currentConversation.windowOpened(port);

      expect(currentConversation.port).to.be.equal(port);
    });

    it("should post a talkilla.login-success event", function() {
      currentConversation = new Conversation(data);

      currentConversation.windowOpened(port);

      sinon.assert.called(port.postEvent);
      sinon.assert.calledWith(port.postEvent, "talkilla.login-success",
        {username: "romain"});
    });

    it("should post a talkilla.conversation-open event for a " +
       "non-incoming call", function() {
        currentConversation = new Conversation(data);

        currentConversation.windowOpened(port);

        sinon.assert.called(port.postEvent);
        sinon.assert.calledWith(port.postEvent,
                                "talkilla.conversation-open",
                                data);
      });

    it("should post a talkilla.conversation-incoming event for an " +
       "incoming call",
      function() {
        data.offer = {sdp: "fake"};
        currentConversation = new Conversation(data);

        currentConversation.windowOpened(port);

        sinon.assert.called(port.postEvent);
        sinon.assert.calledWith(port.postEvent,
                                "talkilla.conversation-incoming",
                                data);

      });

    it("should store the contact", function() {
        currentConversation = new Conversation(data);

        currentConversation.windowOpened(port);

        sinon.assert.calledOnce(contactsDb.add);
      });

    it("should send peer presence information", function() {
      currentConversation = new Conversation(data);

      currentConversation.windowOpened(port);

      sinon.assert.called(port.postEvent);
      sinon.assert.calledWithMatch(port.postEvent,
                                   "talkilla.conversation-open",
                                   {peerPresence: "connected"});
    });
  });

  describe("#handleIncomingCall", function() {
    var port, initData;

    beforeEach(function() {
      // Avoid touching the contacts db which we haven't initialized.
      sandbox.stub(contactsDb, "add");
      _currentUserData = new UserData({_userName: "romain"});
      port = {
        postEvent: sandbox.spy()
      };
      initData = {
        peer: "florian"
      };

      currentUsers = {
        florian: { presence: "connected" }
      };

      currentConversation = new Conversation(initData);
      currentConversation.windowOpened(port);
    });

    afterEach(function() {
      port = undefined;
      _currentUserData = undefined;
      currentConversation = undefined;
    });

    it("should return false if the conversation is not for the peer",
      function() {
        var data = {
          peer: "jb"
        };

        var result = currentConversation.handleIncomingCall(data);

        expect(result).to.be.equal(false);
      });

    it("should return true if the conversation is for the peer",
      function() {
        var result = currentConversation.handleIncomingCall(initData);

        expect(result).to.be.equal(true);
      });

    it("should post a talkilla.conversation-incoming event for an " +
       "incoming call", function() {
        var incomingData = {
          offer: {
            sdp: "fake"
          },
          peer: "florian"
        };

        currentConversation.handleIncomingCall(incomingData);

        sinon.assert.called(port.postEvent);
        sinon.assert.calledWith(port.postEvent,
                                "talkilla.conversation-incoming",
                                incomingData);
      });

    it("should send peer presence information", function() {
      var incomingData = {
        offer: {
          sdp: "fake"
        },
        peer: "florian"
      };

      currentConversation.handleIncomingCall(incomingData);

      sinon.assert.called(port.postEvent);
      sinon.assert.calledWithMatch(port.postEvent,
                                   "talkilla.conversation-incoming",
                                   {peerPresence: "connected"});
    });
  });

  describe("#callAccepted", function() {
    beforeEach(function() {
      currentConversation = new Conversation({});
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should post a talkilla.call-establishment message to the " +
       "conversation window", function() {
      var data = {
        peer: "nicolas",
        offer: { sdp: "fake" }
      };
      currentConversation.callAccepted(data);

      sinon.assert.calledOnce(currentConversation.port.postEvent);
      sinon.assert.calledWith(currentConversation.port.postEvent,
        "talkilla.call-establishment", data);
    });
  });

  describe("#callHangup" , function() {
    beforeEach(function() {
      currentConversation = new Conversation({});
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should post a talkilla.call-hangup to the conversation window",
       function() {
      var data = {
        peer: "nicolas"
      };
      currentConversation.callHangup(data);

      sinon.assert.calledOnce(currentConversation.port.postEvent);
      sinon.assert.calledWith(currentConversation.port.postEvent,
        "talkilla.call-hangup", data);
    });
  });
});
