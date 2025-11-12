import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  LoadEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import slugify from 'slugify';
import * as config from 'config';
import { FileService } from 'src/services/file/file.service';
import { configObject } from 'src/types/types';
import { DateTime, Duration } from 'luxon';

@EventSubscriber()
export class CommonSubscriber implements EntitySubscriberInterface<any> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fileService: FileService,
  ) {
    this.dataSource.subscribers.push(this);
  }

  getSlugField = (entity: any) => {
    return (
      entity?.first_name ||
      entity?.name ||
      entity?.title ||
      entity?.phone ||
      entity?.category_name
    );
  };

  /**
   * Called before User insertion.
   */
  async beforeInsert(event: InsertEvent<any>) {
    if (!event.entity) return;

    const columns = event.metadata.columns.map((column) => column.propertyName);

    if (columns.includes('slug')) {
      let slugField = this.getSlugField(event.entity);

      let slug = slugify(slugField, { lower: true });

      const manager = this.dataSource.manager;

      const regexPattern = '^' + slug + '(-?\\d+)?$';

      let count = await manager
        .getRepository(event.metadata.target)
        .createQueryBuilder()
        .select('COUNT(id)', 'total_count')
        .where('regexp_like(slug, :regex)', { regex: regexPattern })
        .getCount();

      if (count) {
        slug = `${slug}-${count}`;
      }
      event.entity.slug = slug;
    }

    if (columns.includes('uuid')) {
      event.entity.uuid = this.generateUuId('TXN');
    }

    if (!columns.includes('avatar')) return;

    if (typeof event.entity.avatar === 'object') {
      event.entity.avatar = await this.fileService.saveFile(
        event.entity.avatar,
        event.entity.avatar_path,
      );
    }

    this.cleanEntity(event.entity);
  }

  cleanEntity(entity: any) {
    ['$avatar_path', '$avatar_url', '$avatar_default', '$private_file'].forEach(
      (key) => delete entity[key],
    );
    return entity;
  }

  async beforeUpdate(event: UpdateEvent<any>) {
    const columns = event.metadata.columns.map((column) => column.propertyName);

    if (!columns.includes('avatar')) return;

    if (event?.entity?.avatar !== event.databaseEntity.avatar)
      await this.deleteFile(event.databaseEntity.avatar);

    if (typeof event?.entity?.avatar === 'object') {
      event.entity.avatar = await this.fileService.saveFile(
        event.entity.avatar,
        event.entity.avatar_path,
      );
    }

    this.cleanEntity(event.entity);

  }

  async afterInsert(event: InsertEvent<any>) {
    const columns = event.metadata.columns.map((column) => column.propertyName);

    if (!columns.includes('avatar')) return;

    await this.handleImageProcessing(event.entity);
  }

  async afterUpdate(event: UpdateEvent<any>) {
    const columns = event.metadata.columns.map((column) => column.propertyName);

    if (!columns.includes('avatar') || !event.entity) return;

    event.entity.PRIVATE_FILE = event.databaseEntity.PRIVATE_FILE;

    await this.handleImageProcessing(event.entity);
  }

  async afterRemove(event: RemoveEvent<any>) {
    const columns = event.metadata.columns.map((column) => column.propertyName);
    if (!columns.includes('avatar')) return;
    typeof event?.entity?.avatar === 'string' &&
      (await this.deleteFile(event?.entity?.avatar));
  }

  async deleteFile(image?: string | null | Express.Multer.File) {
    image && typeof image === 'string' && this.fileService.destroyFile(image);
  }

  async handleImageProcessing(entity: any) {
    if (!entity.avatar) {
      entity.avatar_url = null;
      return;
    }

    if (config.get<configObject>('storage').disk === 'local') {
      entity.avatar_url = `${config.get<configObject>('app').url}/${entity.avatar}`;
    } else if (entity.PRIVATE_FILE && typeof entity.avatar === 'string') {
      entity.avatar_url = await this.fileService.generateSignedUrl(
        entity.avatar,
      );
    } else {
      entity.avatar_url = `${config.get<configObject>('aws').endpoint}/${entity.avatar}`;
    }
  }

  async afterLoad(entity: any, event: LoadEvent<any>) {
    const columns = event.metadata.columns.map((column) => column.propertyName);

    for (let column of columns) {
      if (
        (column.includes('_date') ||
          column.includes('_at') ||
          column.includes('claimed_on')) &&
        entity[column]
      ) {
        const date = DateTime.fromJSDate(entity[column]);
        const dayWithOrdinal = date.day + this.getOrdinalSuffix(date.day);
        entity[`$formatted_${column}`] =
          `${dayWithOrdinal} ${date.toFormat(config.get<string>('date_format') || 'LLL yy')}`;
      }

      if (column.includes('_time') && entity[column]) {
        const time = DateTime.fromFormat(entity[column], 'HH:mm:ss');
        entity[`$formatted_${column}`] = time.toFormat('hh:mm a');
      }

      if (column.includes('duration') && entity[column]) {
        const parts = entity[column].split(':');
        const hours = Number(parts[0] || 0);
        const minutes = Number(parts[1] || 0);
        const seconds = Number(parts[2] || 0);

        const duration = Duration.fromObject({
          hours: Number.isFinite(hours) ? hours : 0,
          minutes: Number.isFinite(minutes) ? minutes : 0,
          seconds: Number.isFinite(seconds) ? seconds : 0,
        });

        entity[`$formatted_${column}`] = `${duration.hours}h ${duration.minutes}m`;
      }
      if (column.includes('avgWorkHrs') && entity[column]) {
        const parts = entity[column].split(':');
        const hours = Number(parts[0] || 0);
        const minutes = Number(parts[1] || 0);
        const seconds = Number(parts[2] || 0);

        const duration = Duration.fromObject({
          hours: Number.isFinite(hours) ? hours : 0,
          minutes: Number.isFinite(minutes) ? minutes : 0,
          seconds: Number.isFinite(seconds) ? seconds : 0,
        });

        entity[`$formatted_${column}`] = `${duration.hours}h ${duration.minutes}m`;
      }
    }

    await this.handleImageProcessing(entity);
  }

  getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th'; // 4th - 20th are always 'th'
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  generateUuId(tableName: string) {
    let prefixName = tableName;

    // Get the current timestamp in milliseconds
    const timestamp = Date.now();

    // Generate a random number from 0 to 99999
    const randomPart = Math.floor(Math.random() * 100000);

    // Combine timestamp and random part, then take modulo 100000 to ensure it's within 5 digits
    const uniqueNumber = (timestamp + randomPart) % 100000;

    // Format to ensure it's a 5-digit number (pad with zeros if necessary)
    let uuid = uniqueNumber.toString().padStart(5, '0');

    return `#${prefixName}${uuid}`;
  }
}
