// business-verification.entity.ts
import { Entity, EntityRepositoryType, ManyToOne, Property } from "@mikro-orm/postgresql";
import { CustomBaseEntity } from "./base.entity";
import { BusinessProfile } from "./business-profile.entity";
import { BusinessVerificationRepository } from "../repositories/business-verification.repository";

export type VerificationType = 'third_party' | 'kyc_admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

@Entity({ repository: () => BusinessVerificationRepository })
export class BusinessVerification extends CustomBaseEntity {
    [EntityRepositoryType]?: BusinessVerificationRepository;

    @ManyToOne(() => BusinessProfile)
    businessProfile!: BusinessProfile;

    @Property()
    verificationType!: VerificationType;

    @Property()
    status: VerificationStatus = 'pending';

    @Property({ nullable: true })
    selfieImageUrl?: string;

    @Property({ nullable: true })
    documentImageUrl?: string;

    @Property({ nullable: true })
    smileJobId?: string;

    @Property({ nullable: true })
    smileUserId?: string;

    @Property({ type: 'json', nullable: true })
    smileResponse?: any;

    @Property({ nullable: true })
    smileResultCode?: string;

    @Property({ nullable: true })
    smileResultText?: string;

    @Property({ nullable: true })
    reviewedBy?: string;

    @Property({ nullable: true })
    reviewedAt?: Date;

    @Property({ type: 'text', nullable: true })
    reviewNotes?: string;

    @Property({ type: 'text', nullable: true })
    rejectionReason?: string;
}