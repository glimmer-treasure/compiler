//Token的类型
export enum TokenKind {
    Keyword,
    Identifier,
    StringLiteral,
    Seperator,
    Operator,
    EOF
}

export enum KeyWords {
    Function = 'function'
}
// 代表一个Token的数据结构
export interface Token {
    kind: TokenKind,
    text: string
}