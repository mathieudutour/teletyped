import shuffle from 'lodash.shuffle'
import matches from 'matches-selector'
import autobind from 'autobind-decorator'

const DEFAULTS = {
  stringsElement: null,

  typeSpeed: 0, // typing speed
  startDelay: 0, // time before typing starts

  backSpeed: 0, // backspacing speed
  backDelay: 500, // time before backspacing

  shuffle: false, // shuffle the strings

  loop: false, // loop
  loopCount: 1, // false = infinite

  showCursor: true, // show cursor
  cursorChar: '|', // character for cursor

  attr: null, // attribute to type (null == text)
  contentType: 'html', // either html or text

  onDone () {}, // call when done callback function
  onBeforeStringTyped () {}, // starting callback function before each string
  onAfterStringTyped () {}, // callback for every typed string
  onReset () {} // callback for reset
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

    // text content of element
    this.elContent = this.options.attr ? this.el.getAttribute(this.options.attr) : this.el.textContent

    // character number position of current string
    this.strPos = 0

    // current string index in array
    this.currentString = 0

    // number to stop backspacing on.
    // default 0, can change depending on how many chars you want to remove at a time
    this.stopNum = 0

    // Looping count
    this.curLoop = 0

    // for stopping
    this.stop = false

    // Insert cursor
    if (!this.isInput && this.options.showCursor) {
      this.el.insertAdjacentHTML('afterend', `<span class="typed-cursor">${this.options.cursorChar}</span>`)
    }

    if (this.options.stringsElement) {
      this.options.stringsElement.style.display = 'none'
      const strings = this.options.stringsElement.querySelectorAll('p')
      this.strings = Array.from(strings).map((string) => string.textContent)
    } else {
      this.strings = this.options.strings
    }

    this.init()
  }

  init () {
    this.timeout = setTimeout(this.start, this.options.startDelay)
  }

  start () {
    if (this.options.shuffle) this.strings = shuffle(this.strings)

    // Start typing
    this.typewrite(this.strings[this.currentString])
  }

  // pass current string state to each function, types 1 char per call
  typewrite (curString) {
		// exit when stopped
    if (this.stop === true) {
      return
    }

		// varying values for setTimeout during typing
		// can't be global since number changes each time loop is executed
    const humanize = Math.round(Math.random() * (100 - 30)) + this.options.typeSpeed

		// contain typing function in a timeout humanize'd delay
    this.timeout = setTimeout(this._type, humanize, curString)
  }

  _type (curString) {
    // check for an escape character before a pause value
    // format: \^\d+ .. eg: ^1000 .. should be able to print the ^ too using ^^
    // single ^ are removed from string
    let charPause = 0
    let substr = curString.substr(this.strPos)
    if (substr.charAt(0) === '^') {
      let skip = 1 // skip at least 1
      if (/^\^\d+/.test(substr)) {
        substr = /\d+/.exec(substr)[0]
        skip += substr.length
        charPause = parseInt(substr)
      }

      // strip out the escape character and pause value so they're not printed
      curString = curString.substring(0, this.strPos) + curString.substring(this.strPos + skip)
    }

    if (this.options.contentType === 'html') {
      // skip over html tags while typing
      const curChar = curString.substr(this.strPos).charAt(0)
      if (curChar === '<' || curChar === '&') {
        let tag = ''
        const endTag = curChar === '<' ? '>' : ';'
        while (curString.substr(this.strPos).charAt(0) !== endTag) {
          tag += curString.substr(this.strPos).charAt(0)
          this.strPos++
        }
        this.strPos++
        tag += endTag
      }
    }

    // timeout for any pause after a character
    this.timeout = setTimeout(this._afterType, charPause, curString)
  }

  _afterType (curString) {
    if (this.strPos === curString.length) {
      // fires callback function
      this.options.onAfterStringTyped(this.currentString)

      // is this the final string
      if (this.currentString === this.options.strings.length - 1) {
        // animation that occurs on the last typed string
        this.options.onDone()

        this.curLoop++

        // quit if we wont loop back
        if (!this.options.loop || this.curLoop >= this.options.loopCount) {
          return
        }
      }

      this.timeout = setTimeout(this.backspace, this.options.backDelay, curString)
    } else {
      /* call before functions if applicable */
      if (this.strPos === 0) {
        this.options.onBeforeStringTyped(this.currentString)
      }

      // start typing each new char into existing string
      // curString: arg, self.el.html: original text inside element
      const nextString = curString.substr(0, this.strPos + 1)
      this._setString(nextString)

      // loop the function
      this.typewrite(curString, ++this.strPos)
    }
  }

  _setString (nextString) {
    if (this.options.attr) {
      this.el.setAttribute(this.options.attr, nextString)
    } else if (this.isInput) {
      this.el.value = nextString
    } else if (this.options.contentType === 'html') {
      this.el.innerHTML = nextString
    } else {
      this.el.textContent = nextString
    }
  }

  _typeBack (curString) {
    if (this.options.contentType === 'html') {
      // skip over html tags while backspacing
      if (curString.substr(this.strPos).charAt(0) === '>') {
        var tag = ''
        while (curString.substr(this.strPos).charAt(0) !== '<') {
          tag -= curString.substr(this.strPos).charAt(0)
          this.strPos--
        }
        this.strPos--
        tag += '<'
      }
    }

    // replace text with base text + typed characters
    const nextString = curString.substr(0, this.strPos)
    this._setString(nextString)

    // if the number (id of character in current string) is
    // less than the stop number, keep going
    if (this.strPos > this.stopNum) {
      // loop the function
      this.backspace(curString, --this.strPos)
    } else if (this.strPos <= this.stopNum) {
      // if the stop number has been reached, increase
      // array position to next string
      this.currentString++

      if (this.currentString === this.options.strings.length) {
        this.currentString = 0

        // Shuffle sequence again
        if (this.options.shuffle) this.strings = shuffle(this.strings)

        this.init()
      } else {
        this.typewrite(this.strings[this.currentString], this.strPos)
      }
    }
    // humanized value for typing
  }

  backspace (curString) {
    // exit when stopped
    if (this.stop === true) {
      return
    }

    // varying values for setTimeout during typing
    // can't be global since number changes each time loop is executed
    const humanize = Math.round(Math.random() * (100 - 30)) + this.options.backSpeed

    this.timeout = setTimeout(this._typeBack, humanize, curString)
  }

	// Reset and rebuild the element
  reset () {
    clearInterval(this.timeout)
    const id = this.el.getAttribute('id')
    this.el.insertAdjacentHTML('afterend', `<span id="${id}"></span>`)
    this.el.parentNode.removeChild(this.el)
    if (typeof this.cursor !== 'undefined') {
      this.cursor.parentNode.removeChild(this.cursor)
    }
		// Send the callback
    this.options.onReset()
  }
}

export default Typed
