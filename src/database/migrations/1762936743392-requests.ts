import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class Requests1762936743392 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
              new Table({
                name: 'requests',
                columns: [
                  {
                    name: 'id',
                    type: 'int',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'increment',
                  },
                  {
                    name: 'first_name',
                    type: 'varchar',
                    isNullable: false,
                  },
                  {
                    name: 'last_name',
                    type: 'varchar',
                    isNullable: true,
                  },
                  {
                    name: 'email',
                    type: 'varchar',
                    isNullable: true,
                    isUnique: true,
                  },
                  {
                    name: 'password',
                    type: 'varchar',
                    isNullable: true,
                  },
                  {
                    name: 'phone',
                    type: 'varchar',
                    isNullable: true,
                    isUnique: true,
                  },
                  {
                    name: 'role',
                    type: 'varchar',
                    isNullable: false,
                    default: `'user'`,
                  },
                  {
                    name: 'status',
                    type: 'enum',
                    enum: ['active', 'inactive'],
                    default: `'active'`,
                  },
                  {
                    name: 'avatar',
                    type: 'varchar',
                    isNullable: true,
                  },
                  {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                  },
                  {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                  },
                ],
              }),
            );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
         await queryRunner.dropTable('requests');
    }

}
