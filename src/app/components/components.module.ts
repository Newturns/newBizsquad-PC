import {ModuleWithProviders, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {LastMessageComponent} from "./last-message/last-message.component";
import { ChatHeaderComponent } from './chat-header/chat-header';
import {MessageComponent} from "./message/message.component";
import {AvatarButtonComponent} from "./avatar-button/avatar-button.component";
import {ImgComponent} from "./img/img.component";
import {SquadFilterComponent} from "./squad-filter/squad-filter.component";
import {SquadItemComponent} from "./squad-item/squad-item.component";
import {TeamIconComponent} from "./team-icon/team-icon.component";
import {GroupColorDirective} from "../biz-common/directives/group-color.directive";
import {BizButtonComponent} from "./biz-button/biz-button.component";
import {NoticeItemComponent} from "./notice-item/notice-item.component";
import {ChatItemComponent} from "./chat-item/chat-item.component";
import {GroupLogoComponent} from "./group-logo/group-logo.component";
import {BizCheckBtnComponent} from "./biz-check-btn/biz-check-btn.component";
import {ChatNoticeComponent} from "./chat-notice/chat-notice.component";
import {MessageBalloonComponent} from "./message-balloon/message-balloon.component";
import {ChatAttachComponent} from "./chat-attach/chat-attach.component";
import {MembersPopoverComponent} from "./members-popover/members-popover";
import {WarnPopoverComponent} from "./warn-popover/warn-popover";
import {ChangeTitlePopoverComponent} from "./change-title-popover/change-title-popover";
import {IonicModule} from '@ionic/angular';
import {PipesModule} from './pipes/pipes.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TokenProvider} from '../biz-common/token';
import {LoadingProvider} from '../providers/loading';
import {CustomLinkComponent} from './custom-link/custom-link.component';
import {ProfilePopoverComponent} from './profile-popover/profile-popover.component';
import {ChatMenuPopoverComponent} from './chat-menu-popover/chat-menu-popover.component';
import {InviteChatPopoverComponent} from './invite-chat-popover/invite-chat-popover.component';
import {CreateChatPopoverComponent} from './create-chat-popover/create-chat-popover.component';
import {GoogleTransTextComponent} from './google-trans-text/google-trans-text.component';
import {MessageReplyComponent} from './message-reply/message-reply.component';
import {ClipboardAttachPopoverComponent} from './clipboard-attach-popover/clipboard-attach-popover.component';

@NgModule({
    declarations: [
        LastMessageComponent,
        ChatHeaderComponent,
        MessageComponent,
        AvatarButtonComponent,
        ImgComponent,
        SquadFilterComponent,
        SquadItemComponent,
        TeamIconComponent,
        BizButtonComponent,
        NoticeItemComponent,
        ChatItemComponent,
        GroupLogoComponent,
        BizCheckBtnComponent,
        ChatNoticeComponent,
        MessageBalloonComponent,
        ChatAttachComponent,
        GroupColorDirective,
        MembersPopoverComponent,
        WarnPopoverComponent,
        ChangeTitlePopoverComponent,
        ProfilePopoverComponent,
        CustomLinkComponent,
        ChatMenuPopoverComponent,
        InviteChatPopoverComponent,
        CreateChatPopoverComponent,
        GoogleTransTextComponent,
        ClipboardAttachPopoverComponent,
        MessageReplyComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        PipesModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    exports: [
        LastMessageComponent,
        ChatHeaderComponent,
        MessageComponent,
        AvatarButtonComponent,
        ImgComponent,
        SquadFilterComponent,
        SquadItemComponent,
        TeamIconComponent,
        BizButtonComponent,
        NoticeItemComponent,
        ChatItemComponent,
        GroupLogoComponent,
        BizCheckBtnComponent,
        ChatNoticeComponent,
        GroupColorDirective,
        ChatAttachComponent,
        MessageBalloonComponent,
        MembersPopoverComponent,
        WarnPopoverComponent,
        ChatMenuPopoverComponent,
        ChangeTitlePopoverComponent,
        ProfilePopoverComponent,
        InviteChatPopoverComponent,
        CustomLinkComponent,
        CreateChatPopoverComponent,
        ClipboardAttachPopoverComponent,
        GoogleTransTextComponent,
        MessageReplyComponent,
    ],
    entryComponents: [
        MembersPopoverComponent,
        WarnPopoverComponent,
        ChangeTitlePopoverComponent,
        ProfilePopoverComponent,
        ChatMenuPopoverComponent,
        InviteChatPopoverComponent,
        ClipboardAttachPopoverComponent,
        CustomLinkComponent,
        CreateChatPopoverComponent
    ],
    providers: [
        TokenProvider,
        LoadingProvider,
    ]
})
export class ComponentsModule {
    static forRoot(): ModuleWithProviders{
        return {
            ngModule: ComponentsModule,
        }
    }
}
