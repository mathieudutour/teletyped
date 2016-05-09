import shuffle from 'lodash.shuffle'
import matches from 'matches-selector'
import autobind from 'autobind-decorator'

const DEFAULTS = {
  stringsElement: null,
  // typing speed
  typeSpeed: 0,
  // time before typing starts
  startDelay: 0,
  // backspacing speed
  backSpeed: 0,
  // shuffle the strings
  shuffle: false,
  // time before backspacing
  backDelay: 500,
  // loop
  loop: false,
  // false = infinite
  loopCount: false,
  // show cursor
  showCursor: true,
  // character for cursor
  cursorChar: '|',
  // attribute to type (null == text)
  attr: null,
  // either html or text
  contentType: 'html',
  // call when done callback function
  callback () {},
  // starting callback function before each string
  preStringTyped () {},
  // callback for every typed string
  onStringTyped () {},
  // callback for reset
  resetCallback () {}
}

@autobind
class Typed {
  constructor (el, options) {
    // chosen element to manipulate text
    this.el = el

    // options
    this.options = {...DEFAULTS, ...options}

    // attribute to type into
    this.isInput = matches(this.el, 'input')
    this.attr = this.options.attr

    // show cursor
    this.showCursor = !this.isInput && this.options.showCursor

    // text content of element
    this.elContent = this.attr ? this.el.getAttribute(this.attr) : this.el.textContent

    // html or plain text
    this.contentType = this.options.contentType

    // typing speed
    this.typeSpeed = this.options.typeSpeed

    // add a delay before typing starts
    this.startDelay = this.options.startDelay

    // backspacing speed
    this.backSpeed = this.options.backSpeed

    // amount of time to wait before backspacing
    this.backDelay = this.options.backDelay

    // div containing strings
    this.stringsElement = this.options.stringsElement

    // input strings of text
    this.strings = this.options.strings

    // character number position of current string
    this.strPos = 0

    // current array position
    this.arrayPos = 0

    // number to stop backspacing on.
    // default 0, can change depending on how many chars
    // you want to remove at the time
    this.stopNum = 0

    // Looping logic
    this.loop = this.options.loop
    this.loopCount = this.options.loopCount
    this.curLoop = 0

    // for stopping
    this.stop = false

    // custom cursor
    this.cursorChar = this.options.cursorChar

    // shuffle the strings
    this.shuffle = this.options.shuffle
    // the order of strings
    this.sequence = []

    // All systems go!
    this.build()
  }

  init () {
    // begin the loop w/ first current string (global self.strings)
    // current string will be passed as an argument each time after this
    this.timeout = setTimeout(this.start, this.startDelay)
  }

  start () {
    for (var i = 0; i < this.strings.length; ++i) this.sequence[i] = i

    // shuffle the array if true
    if (this.shuffle) this.sequence = shuffle(this.sequence)

    // Start typing
    this.typewrite(this.strings[this.sequence[this.arrayPos]], this.strPos)
  }

  build () {
    // Insert cursor
    if (this.showCursor === true) {
      this.el.insertAdjacentHTML('afterend', `<span class="typed-cursor">${this.cursorChar}</span>`)
    }
    if (this.stringsElement) {
      this.strings = []
      this.stringsElement.style.display = 'none'
      var strings = this.stringsElement.querySelectorAll('p')
      this.strings = Array.from(strings).map((string) => string.textContent)
    }
    this.init()
  }

  setString (nextString) {
    if (this.attr) {
      this.el.setAttribute(this.attr, nextString)
    } else if (this.isInput) {
      this.el.value = nextString
    } else if (this.contentType === 'html') {
      this.el.innerHTML = nextString
    } else {
      this.el.textContent = nextString
    }
  }

  _type (curString, curStrPos) {
    // check for an escape character before a pause value
    // format: \^\d+ .. eg: ^1000 .. should be able to print the ^ too using ^^
    // single ^ are removed from string
    var charPause = 0
    var substr = curString.substr(curStrPos)
    if (substr.charAt(0) === '^') {
      var skip = 1 // skip atleast 1
      if (/^\^\d+/.test(substr)) {
        substr = /\d+/.exec(substr)[0]
        skip += substr.length
        charPause = parseInt(substr)
      }

      // strip out the escape character and pause value so they're not printed
      curString = curString.substring(0, curStrPos) + curString.substring(curStrPos + skip)
    }

    if (this.contentType === 'html') {
      // skip over html tags while typing
      var curChar = curString.substr(curStrPos).charAt(0)
      if (curChar === '<' || curChar === '&') {
        var tag = ''
        var endTag = curChar === '<' ? '>' : ';'
        while (curString.substr(curStrPos).charAt(0) !== endTag) {
          tag += curString.substr(curStrPos).charAt(0)
          curStrPos++
        }
        curStrPos++
        tag += endTag
      }
    }

    // timeout for any pause after a character
    this.timeout = setTimeout(this._afterType, charPause, curString, curStrPos)
  }

  _afterType (curString, curStrPos) {
    if (curStrPos === curString.length) {
      // fires callback function
      this.options.onStringTyped(this.arrayPos)

      // is this the final string
      if (this.arrayPos === this.strings.length - 1) {
        // animation that occurs on the last typed string
        this.options.callback()

        this.curLoop++

        // quit if we wont loop back
        if (this.loop === false || this.curLoop === this.loopCount) {
          return
        }
      }

      this.timeout = setTimeout(this.backspace, this.backDelay, curString, curStrPos)
    } else {
      /* call before functions if applicable */
      if (curStrPos === 0) {
        this.options.preStringTyped(this.arrayPos)
      }

      // start typing each new char into existing string
      // curString: arg, self.el.html: original text inside element
      var nextString = curString.substr(0, curStrPos + 1)
      this.setString(nextString)

      // loop the function
      this.typewrite(curString, curStrPos + 1)
    }
  }

	// pass current string state to each function, types 1 char per call
  typewrite (curString, curStrPos) {
		// exit when stopped
    if (this.stop === true) {
      return
    }

		// varying values for setTimeout during typing
		// can't be global since number changes each time loop is executed
    var humanize = Math.round(Math.random() * (100 - 30)) + this.typeSpeed

		// contain typing function in a timeout humanize'd delay
    this.timeout = setTimeout(this._type, humanize, curString, curStrPos)
  }

  _typeBack (curString, curStrPos) {
    // ----- this part is optional ----- //
    // check string array position
    // on the first string, only delete one word
    // the stopNum actually represents the amount of chars to
    // keep in the current string. In my case it's 14.
    // if (self.arrayPos == 1){
    //  self.stopNum = 14;
    // }
    // every other time, delete the whole typed string
    // else{
    //  self.stopNum = 0;
    // }

    if (this.contentType === 'html') {
      // skip over html tags while backspacing
      if (curString.substr(curStrPos).charAt(0) === '>') {
        var tag = ''
        while (curString.substr(curStrPos).charAt(0) !== '<') {
          tag -= curString.substr(curStrPos).charAt(0)
          curStrPos--
        }
        curStrPos--
        tag += '<'
      }
    }

    // ----- continue important stuff ----- //
    // replace text with base text + typed characters
    var nextString = curString.substr(0, curStrPos)
    this.setString(nextString)

    // if the number (id of character in current string) is
    // less than the stop number, keep going
    if (curStrPos > this.stopNum) {
      // loop the function
      this.backspace(curString, curStrPos - 1)
    } else if (curStrPos <= this.stopNum) {
      // if the stop number has been reached, increase
      // array position to next string
      this.arrayPos++

      if (this.arrayPos === this.strings.length) {
        this.arrayPos = 0

        // Shuffle sequence again
        if (this.shuffle) this.sequence = shuffle(this.sequence)

        this.init()
      } else {
        this.typewrite(this.strings[this.sequence[this.arrayPos]], curStrPos)
      }
    }
    // humanized value for typing
  }

  backspace (curString, curStrPos) {
    // exit when stopped
    if (this.stop === true) {
      return
    }

    // varying values for setTimeout during typing
    // can't be global since number changes each time loop is executed
    var humanize = Math.round(Math.random() * (100 - 30)) + this.backSpeed

    this.timeout = setTimeout(this._typeBack, humanize, curString, curStrPos)
  }

	// Start & Stop currently not working

	// , stop: function() {
	//     var self = this;

	//     self.stop = true;
	//     clearInterval(self.timeout);
	// }

	// , start: function() {
	//     var self = this;
	//     if(self.stop === false)
	//        return;

	//     this.stop = false;
	//     this.init();
	// }

	// Reset and rebuild the element
  @autobind
  reset () {
    clearInterval(this.timeout)
    var id = this.el.getAttribute('id')
    this.el.insertAdjacentHTML('afterend', `<span id="${id}"></span>`)
    this.el.parentNode.removeChild(this.el)
    if (typeof this.cursor !== 'undefined') {
      this.cursor.parentNode.removeChild(this.cursor)
    }
		// Send the callback
    this.options.resetCallback()
  }
}

export default Typed
