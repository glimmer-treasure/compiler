/**
 * 分词器，用于此法分析
 */

import {Token, TokenKind, KeyWords} from './types'


/**
 * 一个字符串流。其操作为：
 * peek():预读下一个字符，但不移动指针；
 * next():读取下一个字符，并且移动指针；
 * eof():判断是否已经到了结尾。
 */
class CharStream {
    data: string
    pos: number = 0
    line: number = 1
    col: number = 0
    
    constructor(data: string) {
        this.data = data
    }

    peek(): string {
        return this.data.charAt(this.pos)
    }

    next(): string {
        let ch = this.data.charAt(this.pos++)
        if (ch == '\n') {
            this.line++
            this.col = 0
        } else {
            this.col++
        }
        return ch
    }

    eof(): boolean {
        return this.peek() === ''
    }
}

class EofToken implements Token {
    kind: TokenKind = TokenKind.EOF
    text: string = ''
}

class SeperatorToken implements Token {
    kind: TokenKind = TokenKind.Seperator
    text: string = ''
    constructor(text: string) {
        this.text = text
    }
}

class OperatorToken implements Token {
    kind: TokenKind = TokenKind.Operator
    text: string = ''
    constructor(text: string) {
        this.text = text
    }
}

class StringLiteralToken implements Token {
    kind: TokenKind = TokenKind.StringLiteral
    text: string = ''
    constructor(text: string) {
        this.text = text
    }
}

class IdentifierToken implements Token {
    kind: TokenKind = TokenKind.StringLiteral
    text: string = ''
    constructor(text: string) {
        this.text = text
    }
}

class KeywordToken implements Token {
    kind: TokenKind = TokenKind.Keyword
    text: string = ''
    constructor(text: string) {
        this.text = text
    }
}

/**
 * 词法分析器。
 * 词法分析器的接口像是一个流，词法解析是按需进行的。
 * 支持下面两个操作：
 * next(): 返回当前的Token，并移向下一个Token。
 * peek(): 返回当前的Token，但不移动当前位置。
 */
export default class Tokenizer {
    stream: CharStream
    nextToken: Token = new EofToken()

    constructor(stream: CharStream) {
        this.stream = stream
    }

    next(): Token {
        //在第一次的时候，先parse一个Token
        if (this.nextToken.kind === TokenKind.EOF && !this.stream.eof()) {
            this.nextToken = this.getAToken()
        }
        let lastToken = this.nextToken
        //往前走一个Token
        this.nextToken = this.getAToken()
        return lastToken
    }

    peek(): Token {
        if (this.nextToken.kind === TokenKind.EOF && this.stream.eof()) {
            this.nextToken = this.getAToken()
        }
        return this.nextToken
    }

    //从字符串流中获取一个新Token。
    private getAToken(): Token {
        this.skipWhiteSpace()
        if (this.stream.eof()) {
            return new EofToken()
        } else {
            let ch: string = this.stream.peek()
            if (this.isLetter(ch) || this.isDigit(ch)) {
                return this.parseIdentifer()
            } else if (ch === '"') {
                return this.parseStringLiteral()
            } else if (this.isSeperator(ch)) {
                this.stream.next()
                return new SeperatorToken(ch)
            } else if (ch === '/') {
                this.stream.next()
                let ch1 = this.stream.peek()
                if (ch1 === '*') {
                    this.skipMultipleLineComments()
                    return this.getAToken()
                } else if (ch1 === '/') {
                    this.skipSingleLineComment()
                    return this.getAToken()
                } else if (ch1 === '=') {
                    this.stream.next()
                    return new OperatorToken('/=')
                } else {
                    return new OperatorToken('/')
                }
            } else if (ch === '+') {
                this.stream.next()
                let ch1 = this.stream.peek()
                if (ch1 === '+') {
                    this.stream.next()
                    return new OperatorToken('++')
                } else if (ch1 === '=') {
                    this.stream.next()
                    return new OperatorToken('+=')
                } else {
                    return new OperatorToken('+')
                }
            } else if (ch === '-') {
                this.stream.next()
                let ch1 = this.stream.peek()
                if (ch1 === '-') {
                    this.stream.next()
                    return new OperatorToken('--')
                } else if (ch1 === '=') {
                    this.stream.next()
                    return new OperatorToken('-=')
                } else {
                    return new OperatorToken('-')
                }
            } else if (ch === '*') {
                this.stream.next()
                let ch1 = this.stream.peek()
                if (ch1 === '=') {
                    this.stream.next()
                    return new OperatorToken('*=')
                } else {
                    return new OperatorToken('*')
                }
            } else {
                console.log(`Unrecognized pattern meeting : '${ch}', at ${this.stream.line} col: ${this.stream.col}`)
                this.stream.next()
                return this.getAToken()
            }
        }
    }

    /**
     * 跳过单行注释
     */
    private skipSingleLineComment() {
        // 跳过第二个/，第一个之前已经跳过去。
        this.stream.next()

        // 往后一直找到回车或者eof
        while(this.stream.peek() != '\n' && !this.stream.eof()) {
            this.stream.next()
        }
    }

    /**
     * 跳过多行注释
     */
    private skipMultipleLineComments() {
        // 跳过*，/之前已经跳过去了。
        this.stream.next()
        if (!this.stream.eof()) {
            let ch1 = this.stream.next()
            while (!this.stream.eof()) {
                let ch2 = this.stream.next()
                if (ch1 === '*' && ch2 === '/') {
                    return;
                }
                ch1 = ch2
            }
        }
        //如果没有匹配上，报错。
        console.log(`Failed to find matching */ for multiple line comments at: ${this.stream.line} col: ${this.stream.col}`);
    }

    /**
     * 跳过空白字符
     */
    private skipWhiteSpace() {
        while (this.isWhiteSpace(this.stream.peek())) {
            this.stream.next()
        }
    }

    /**
     * 字符串字面量。
     * 目前只支持双引号，并且不支持转义。
     */
    private parseStringLiteral(): Token {
        let token: Token = new StringLiteralToken('')
        //第一个字符不用判断，因为在调用者那里已经判断过了
        this.stream.next()
        // 读入后续字符
        while(!this.stream.eof() && this.stream.peek() !== '"') {
            token.text += this.stream.next()
        }
        if (this.stream.peek() === '"') {
            //消化掉字符换末尾的引号
            this.stream.next()
        } else {
            console.log(`Expecting an at line: ${this.stream.line} col: ${this.stream.col}`);
        }
        return token
    }

    private parseIdentifer(): Token {
        let token: Token = new IdentifierToken('')
        //第一个字符不用判断，因为在调用者那里已经判断过了
        token.text += this.stream.next()
        //读入后续字符
        while(this.stream.eof() && this.isLetterDigitOrUnderScore(this.stream.peek())) {
            token.text+=this.stream.next()
        }
        //识别出关键字
        if (token.text === KeyWords.Function) {
            token = new KeywordToken(KeyWords.Function)
        }
        return token
    }

    private isLetterDigitOrUnderScore(ch: string): boolean {
        switch (true) {
            case this.isLetter(ch):
            case this.isDigit(ch):
            case ch === '_':
                return true
            default:
                return false
        }
    }

    private isLetter(ch: string): boolean {
        switch(true) {
            case ch >= 'A' && ch <= 'Z':
            case ch >= 'a' && ch <= 'z':
                return true
            default:
                return false
        }
    }

    private isDigit(ch: string): boolean {
        return ch >= '0' && ch <= '9'
    }

    private isWhiteSpace(ch: string): boolean {
        return ch === ' ' || ch === '\n' || ch === '\t'
    }

    /**
     * 是否是分割符
     */
    isSeperator(ch: string): boolean {
        const seperators = ['(', ')', '{', '}', ';', ',']
        return seperators.includes(ch)
    }
}