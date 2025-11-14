
export type userStatus = 'pending' | 'active' | 'deactive' | "blocked"

export type UserType = 'sme' | 'expert' | 'referred' | 'admin';

export type Organisation = {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;

}

export type Permission = {
    id: string;
    name: string;
    slug: string;
    description: string;
    created_at: Date;
    updated_at: Date;
}

export type Role = {
    id: string;
    name: string;
    slug: string;
    description: string;
    created_at: Date;
    updated_at: Date;
}
export type UserData = {
    id: number;
    first_name: string;
    last_name: string;
    slug: string;
    user_type: UserType;
    email: string;
    phone: number;
    status: string;
}

export type PermissionType = {
    id: string;
    name: string;
    slug: string;
    description: string;
    created_at: Date;
    updated_at: Date;
}