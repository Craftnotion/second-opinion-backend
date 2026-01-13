import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveSlugFromRequests1736762040000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the slug column from requests table
        await queryRunner.dropColumn('requests', 'slug');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add slug column if needed to rollback
        await queryRunner.addColumn(
            'requests',
            new TableColumn({
                name: 'slug',
                type: 'varchar',
                isNullable: true,
            }),
        );
    }
}
