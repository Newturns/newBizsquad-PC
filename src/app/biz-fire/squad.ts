import {DocumentSnapshot, GroupBase} from '../_models';

import {ISquad, ISquadData} from '../providers/squad.service';

export class Squad extends GroupBase implements ISquad {

  sid: string;
  data: ISquadData;

  gid: string;
  uid: string;
  doc: any;
  ref: any;

  //private readonly uid: string;
  constructor(sid: string, data: ISquadData, uid?: string, gid?: string, ref?: any) {
    super();
    this.sid = sid;
    this.data = data;
    this.uid = uid;
    this.gid = gid;
    this.ref = ref;
  }

  isPublic(): boolean {
    if(this.data == null){
      throw new Error('this.data is null!!');
    }
    return this.data.type === 'public';
  }

}


export class SquadBuilder {
  static buildFromSnapshotChanges(change: any, uid: string, gid?: string ): ISquad {
    //{sid: change.payload.doc.id, data: change.payload.doc.data()
    return new Squad(change.payload.doc.id, change.payload.doc.data(), uid, gid, change.payload.doc.ref);
  }

  static buildFromDoc(doc: DocumentSnapshot, uid: string): ISquad {
    if(doc.exists === false){
      console.error(`buildFromDoc. ${doc.ref.path} doc not exist.`);
      return null;
    }
    const s: ISquad = new Squad(doc.id, doc.data() as ISquadData);
    s.doc = doc;
    s.ref = doc.ref;
    if(s.data.gid == null){
      const path = s.ref.path.split('/');
      s.data.gid = path[1];
      s.gid = path[1];
    }
    s.data.id = doc.id;
    s.uid  = uid;
    return s;
  }


  static buildFromData(sid: string, data: any, uid: string, gid?: string, ref?: any): ISquad {
    if(data == null) return null;
    return new Squad(sid, data, uid, gid, ref);
  }



}
