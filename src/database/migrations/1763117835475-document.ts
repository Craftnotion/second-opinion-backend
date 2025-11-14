import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Document1763117835475 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'opinion-document',
      new TableColumn({
        name: 'metadata',
        type: 'json',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'document',
      new TableColumn({
        name: 'metadata',
        type: 'json',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
