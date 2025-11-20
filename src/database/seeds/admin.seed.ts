import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../entities/user.entity';

export default class AdminSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    console.log('Seed running');
    const adminEmail = 'craftnotion@gmail.com';
    const adminPhone = '9849551414';
    const userRepository = dataSource.getRepository(User);

    const adminExists = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (!adminExists) {
      const adminUser = userRepository.create({
        full_name: 'Admin',
        slug: 'admin-user',
        email: adminEmail,
        role: 'admin',
        phone: adminPhone,
        location: 'active',
      });
      await userRepository.save(adminUser);
      console.log('Admin user created with email:', adminEmail);
    } else {
      console.log('Admin user already exists with email:', adminEmail);
    }
  }
}
