import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedSlugColumnToUserTable1762975088802 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users 
            ADD COLUMN slug VARCHAR(255) NULL UNIQUE 
            AFTER full_name
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'slug');
    }

}
