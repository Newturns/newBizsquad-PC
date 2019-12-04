import {GroupBase, IBizGroup, IBizGroupData} from '../_models';

export class BizGroup extends GroupBase implements IBizGroup {

    gid: string;
    data: IBizGroupData;
    ref: any;

    constructor(gid: string, data: IBizGroupData, uid: string, ref?: any) {
        super();
        this.gid = gid;
        this.data = this.filterFalseMembers(data);
        this.uid = uid;
        this.ref = ref;
    
        // set default max size
        if(this.data.maxFileSize == null){
            this.data.maxFileSize = 20 * 1000 * 1000; // 20MB
        }
    }
}


export class BizGroupBuilder {
    public static buildWithOnStateChangeAngularFire(change: any, uid: string): IBizGroup {
        return new BizGroup(change.payload.doc.id, change.payload.doc.data(), uid, change.payload.doc.ref);
    }

    public static buildWithData(gid: string, data: any, uid?: string, ref?: any): IBizGroup {
        return new BizGroup(gid, data, uid, ref);
    }
}
