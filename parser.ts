/**
 * 第1节
 * 本节的目的是迅速的实现一个最精简的语言的功能，让你了解一门计算机语言的骨架。
 * 知识点：
 * 1.递归下降的方法做词法分析；
 * 2.语义分析中的引用消解（找到函数的定义）；
 * 3.通过遍历AST的方法，执行程序。
 * 
 * 本节采用的语法规则是极其精简的，只能定义函数和调用函数。定义函数的时候，还不能有参数。
 * prog = (functionDecl | functionCall)* ;
 * functionDecl: "function" Identifier "(" ")"  functionBody;
 * functionBody : '{' functionCall* '}' ;
 * functionCall : Identifier '(' parameterList? ')' ;
 * parameterList : StringLiteral (',' StringLiteral)* ;
 */

/////////////////////////////////////////////////////////////////////////
// 词法分析
// 本节没有提供词法分析器，直接提供了一个Token串。语法分析程序可以从Token串中依次读出
// 一个个Token，也可以重新定位Token串的当前读取位置。
import {TokenKind, Token, KeyWords} from './types'
import Tokenizer, {CharStream} from './tokenizer'

/////////////////////////////////////////////////////////////////////////
// 语法分析
// 包括了AST的数据结构和递归下降的语法解析程序

/**
 * 基类
 */
abstract class AstNode {
    //打印对象信息，prefix是前面填充的字符串，通常用于缩进显示
    public abstract dump(prefix: string): void
}

/**
 * 语句
 * 其子类包括函数声明和函数调用
 */
abstract class Statement extends AstNode {
    static isStatementNode(node: any): node is Statement {
        if (!node) {
            return false
        } else {
            return true
        }
    }
}

/**
 * 程序节点，也是AST的根节点
 */
class Prog extends AstNode {
    stmts: Statement[];
    constructor(stmts: Statement[]) {
        super()
        this.stmts = stmts
    }
    dump(prefix: string): void {
        console.log(`${prefix}Propg`)
        this.stmts.forEach(stmt => stmt.dump(`${prefix}\n`))
    }
}

/**
 * 函数声明节点
 */
class FunctionDecl extends Statement {
    name: string; //函数名称
    body: FunctionBody; //函数体
    constructor(name: string, body: FunctionBody) {
        super();
        this.name = name;
        this.body = body;
    }
    public dump(prefix: string):void {
        console.log(`${prefix}FunctionDecl${this.name}`)
        this.body.dump(`${prefix}\t`)
    }
}

/**
 * 函数体
 */
class FunctionBody extends AstNode {
    stmts: FunctionCall[];
    constructor(stmts: FunctionCall[]) {
        super();
        this.stmts = stmts
    }
    static isFunctionBodyNode(node: any): node is FunctionBody {
        if (!node) {
            return false
        } else if (Object.getPrototypeOf(node) === FunctionBody.prototype) {
            return true
        } else {
            return false
        }
    }
    public dump(prefix: string): void {
        console.log(`${prefix}FunctionBody`)
        this.stmts.forEach(x => x.dump(`${prefix}\t`))
    }
}

/**
 * 函数调用
 */
class FunctionCall extends Statement {
    name: string
    parameters: string[]
    definition: FunctionDecl | null = null
    constructor(name: string, parameters: string[]) {
        super()
        this.name = name
        this.parameters = parameters
    }
    static isFunctionCallNode(node: any): node is FunctionBody {
        if (!node) {
            return false
        } else if (Object.getPrototypeOf(node) === FunctionCall.prototype) {
            return true
        } else {
            return false
        }
    }
    public dump(prefix: string): void {
        console.log(`${prefix}FunctionCall ${this.name}, ${this.definition ? 'resolved' : 'not resolved'}`);
        this.parameters.forEach(x => console.log(prefix+"\t"+"Parameter: "+ x));
    }
}

class Parser {
    tokenizer: Tokenizer;
    constructor(tokenizer: Tokenizer) {
        this.tokenizer = tokenizer
    }
    /**
     * 解析Prog
     * 语法规则：
     * prog = (functionDecl | functionCall)* ;
     */
    parseProg():Prog {
        let stmts: Statement[] = [];
        let stmt: Statement | null | void = null;
        let token = this.tokenizer.peek()
        while(token.kind !== TokenKind.EOF) { //每次循环解析一个语句
            //尝试一下函数声明
            if (token.kind === TokenKind.Keyword && token.text === KeyWords.Function) {
                stmt = this.parseFunctionDecl()
            } else if (token.kind === TokenKind.Identifier) {
                stmt = this.parseFunctionCall()
            }
            if (stmt !== null) {
                stmts.push(stmt as Statement)
                console.log("success");
            } else {
                //console.log("Unrecognized token: ");
                // console.log(token);
            }
            token = this.tokenizer.peek()
        }
        return new Prog(stmts)
    }

    /**
     * 解析函数声明
     * 语法规则：
     * functionDecl: "function" Identifier "(" ")"  functionBody;
     */
    parseFunctionDecl(): FunctionDecl|null {
        console.log("in FunctionDecl")
        //跳过关键字'function'
        this.tokenizer.next()
        let t = this.tokenizer.next()
        if (t.kind === TokenKind.Identifier) {
            // 读取()
            let t1 = this.tokenizer.next()
            if (t1.text === '(') {
                let t2 = this.tokenizer.next()
                if (t2.text === ')') {
                    let functionBody = this.parseFunctionBody()
                    if (functionBody !== null) {
                        //如果解析成功，从这里返回
                        return new FunctionDecl(t.text, functionBody)
                    } else {
                        console.log("Error parsing FunctionBody in FunctionDecl");
                        return null
                    }
                } else {
                    console.log("Expecting ')' in FunctionDecl, while we got a " + t.text)
                    return null
                }
            } else {
                console.log("Expecting '(' in FunctionDecl, while we got a " + t.text);
                return null
            }
        } else {
            console.log("Expecting a function name, while we got a " + t.text);
            return null;
        }
    }

    /**
     * 解析函数体
     * 语法规则：
     * functionBody : '{' functionCall* '}' ;
     */
    parseFunctionBody(): FunctionBody|null {
        let stmts:FunctionCall[] = []
        let t: Token = this.tokenizer.next()
        if (t.text === '{') {
            while(this.tokenizer.peek().kind === TokenKind.Identifier) {
                let functionCall = this.parseFunctionCall()
                if (functionCall !== null) {
                    stmts.push(functionCall)
                } else {
                    console.log("Error parsing a FunctionCall in FunctionBody.");
                    return null;
                }
            }
            t = this.tokenizer.next()
            if (t.text === '}') {
                return new FunctionBody(stmts)
            } else {
                console.log("Expecting '}' in FunctionBody, while we got a " + t.text);
                return null;
            }
        } else {
            console.log("Expecting '{' in FunctionBody, while we got a " + t.text);
            return null;
        }
    }

    /**
     * 解析函数调用
     * 语法规则：
     * functionCall : Identifier '(' parameterList? ')' ;
     * parameterList : StringLiteral (',' StringLiteral)* ;
     */
    parseFunctionCall(): FunctionCall | null {
        let params: string[] = []
        let t:Token = this.tokenizer.next()
        if (t.kind === TokenKind.Identifier) {
            let t1: Token = this.tokenizer.next()
            if (t1.text === '(') {
                let t2:Token = this.tokenizer.next()
                while(t2.text !== ')') {
                    if (t2.kind === TokenKind.StringLiteral) {
                        params.push(t2.text)
                    } else {
                        console.log("Expecting parameter in FunctionCall, while we got a " + t2.text);
                        return null; 
                    }
                    t2 = this.tokenizer.next()
                    if (t2.text !== ')') {
                        if (t2.text == ',') {
                            t2 = this.tokenizer.next()
                        } else {
                            console.log("Expecting a comma in FunctionCall, while we got a " + t2.text);
                            return null;
                        }
                    }
                }
                t2 = this.tokenizer.next()
                if (t2.text === ';') {
                    return new FunctionCall(t.text, params)
                } else {
                    console.log("Expecting a semicolon in FunctionCall, while we got a " + t2.text);
                    return null;
                }
            }
        }
        return null
    }
}

/**
 * 对AST做遍历的Vistor。
 * 这是一个基类，定义了缺省的遍历方式。子类可以覆盖某些方法，修改遍历方式。
 */
abstract class AstVistor {
    visitProg(prog: Prog): any {
        let retVal: any
        for(let x of prog.stmts) {
            if (typeof (x as FunctionDecl).body === "object") {
                retVal = this.visitFunctionDecl(x as FunctionDecl)
            } else {
                retVal = this.visitFunctionCall(x as FunctionCall)
            }
        }
        return retVal
    }
    visitFunctionDecl(functionDecl: FunctionDecl): any {
        return this.visitFunctionBody(functionDecl.body)
    }
    visitFunctionBody(functionBody: FunctionBody): any {
        let retVal: any
        for (let x of functionBody.stmts) {
            retVal = this.visitFunctionCall(x)
        }
        return retVal
    }
    visitFunctionCall(functionCall: FunctionCall): any {
        return undefined
    }
}

/////////////////////////////////////////////////////////////////////////
// 语义分析
// 对函数调用做引用消解，也就是找到函数的声明。

/**
 * 遍历AST。如果发现函数调用，就去找它的定义。
 */
class RefResolve extends AstVistor {
    prog: Prog | null = null
    visitProg(prog: Prog): any {
        this.prog = prog
        for (let x of prog.stmts) {
            let functionCall = x as FunctionCall
            if (typeof functionCall.parameters === "object") {
                this.resolveFunctionCall(prog, functionCall)
            } else {
                this.visitFunctionDecl(x as FunctionDecl)
            }
        }
    }
    visitFunctionBody(functionBody: FunctionBody): any {
        if (this.prog !== null) {
            for (let x of functionBody.stmts) {
                return this.resolveFunctionCall(this.prog, x)
            }
        }
    }
    private resolveFunctionCall(prog: Prog, functionCall: FunctionCall) {
        let functionDecl = this.findFunctionDecl(prog, functionCall.name)
        if (functionDecl !== null) {
            functionCall.definition = functionDecl
        } else {
            if (functionCall.name !== "println") { //系统内置函数不用报错
                console.log("Error: cannot find definition of function " + functionCall.name);
            }
        }
    }
    private findFunctionDecl(prog: Prog, name: string): FunctionDecl | null {
        for (let x of prog?.stmts) {
            let functionDecl = x as FunctionDecl
            if (typeof functionDecl.body === "object" && functionDecl.name === name) {
                return functionDecl
            }
        }
        return null
    }
}

/////////////////////////////////////////////////////////////////////////
// 解释器

/**
 * 遍历AST，执行函数调用。
 */
class Intepretor extends AstVistor {
    visitProg(prog: Prog): any {
        let retVal: any
        for(let x of prog.stmts) {
            let functionCall = x as FunctionCall
            if (typeof functionCall.parameters === "object") {
                retVal = this.runFunction(functionCall)
            }
        }
        return retVal
    }
    visitFunctionBody(functionBody: FunctionBody): any {
        let retVal: any
        for (let x of functionBody.stmts) {
            retVal = this.runFunction(x)
        }
    }
    private runFunction(functionCall: FunctionCall) {
        if (functionCall.name === "println") { // 内置函数
            if (functionCall.parameters.length > 0) {
                console.log(functionCall.parameters[0])
            } else {
                console.log()
            }
            return 0
        } else { // 找到函数定义，继续遍历函数体
            if (functionCall.definition !== null) {
                this.visitFunctionBody(functionCall.definition.body)
            }
        }
    }
}

/////////////////////////////////////////////////////////////////////////
// 主程序
export function compileAndRun(progStr) {
    // 词法分析
    let tokenizer = new Tokenizer(new CharStream(progStr))
    // console.log("\n程序所使用的Token")
    // for (let token of tokenArray) {
    //     console.log(token)
    // }

    // 语法分析
    let prog: Prog = new Parser(tokenizer).parseProg()
    console.log("\n语法分析后的AST")
    prog.dump("")

    // 语义分析
    new RefResolve().visitProg(prog)
    console.log("\n语义分析后的AST, 注意自定义函数的调用已被消解;")
    prog.dump("")

    // 运行程序
    console.log("\n运行当前的程序: ")
    let retVal = new Intepretor().visitProg(prog)
    console.log(`程序返回值：${retVal}`)
}
