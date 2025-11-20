import { Entity, EntityRepositoryType, ManyToOne, Property } from "@mikro-orm/postgresql";
import { CustomBaseEntity } from "./base.entity";
import { VendorProfile } from "./vendor-profile.entity";
import { VendorVerificationRepository } from "../repositories/vendor-verification.repository";

export type VerificationType = 'third_party' | 'kyc_admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'processing';
export type DocumentType =
    | 'nin' // National ID Number 
    | 'bvn' // Bank Verification Number 
    | 'passport'
    | 'drivers_license'
    | 'voters_card'
    | 'cac' // Corporate Affairs Commission 
    | 'other';

@Entity({ repository: () => VendorVerificationRepository })
export class VendorVerification extends CustomBaseEntity {
    [EntityRepositoryType]?: VendorVerificationRepository;

    @ManyToOne(() => VendorProfile)
    vendorProfile!: VendorProfile;

    @Property()
    verificationType!: VerificationType;

    @Property()
    status: VerificationStatus = 'pending';

    @Property({ nullable: true })
    documentType?: DocumentType;

    @Property({ nullable: true })
    documentNumber?: string; // Encrypted/hashed in production

    @Property({ nullable: true })
    selfieImageUrl?: string;

    @Property({ nullable: true })
    documentImageUrl?: string;

    // Smile Identity specific fields
    @Property({ nullable: true })
    smileJobId?: string;

    @Property({ nullable: true })
    smileUserId?: string;

    @Property({ type: 'json', nullable: true })
    smileResponse?: any; // Store full response

    @Property({ nullable: true })
    smileResultCode?: string;

    @Property({ nullable: true })
    smileResultText?: string;

    // Admin KYC fields
    @Property({ nullable: true })
    reviewedBy?: string; // Admin user ID

    @Property({ nullable: true })
    reviewedAt?: Date;

    @Property({ type: 'text', nullable: true })
    reviewNotes?: string;

    @Property({ type: 'text', nullable: true })
    rejectionReason?: string;
}
