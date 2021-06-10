export class Message{
    what: number
    obj: Buffer
    constructor(what: number, obj: Buffer) {
        this.what = what;
        this.obj = obj;
    }
}