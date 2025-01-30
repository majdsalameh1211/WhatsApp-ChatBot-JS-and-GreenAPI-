const flowStruct = [
    {
      state: "", // the current state
      question: "", // The bot's current state message ( it sould contain the options in order the user to choose )
      options: { //if options is false that meens there are no option for the user to choose from (the input is text)
        /*
            "option 1": { "nextStep": "state 1.1", "save": "what to save as data when this option is chosen" },
            "option 2": { "nextStep": "state 2.1", "save": "what to save as data when this option is chosen" }
        */
      }, // Options for the user to choose from
      error: {
        message: "", // Error message for invalid inputs
        save: false,  // false --> dont save data when this happens
        nextStep: "" // Where to return if the user provides an invalid input ( the current state )
      },
      save: "", // what to save as title for the user's input if there isnt any options
      multiple_replies: false, // If true, expects multiple messages before moving forward and and end message trigger
      sent: false,  // flag to insure every message is only sent once
      end_state_trigger: false, // If true, this is an ending state when taking multiple messages
      nextStep: "" //if there isnt any options this is the next step (if this is the final step nextstep is " end" this end the bot)

    }
  ];
  
  module.exports = { flowStruct };
  

 