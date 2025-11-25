import {
  CanActivate,
  mixin,
  Type,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as _ from 'lodash';
const { check } = require('acler');

const Is = (roleExpression: string): Type<CanActivate> => {
  class RolesMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const { user } = context.switchToHttp().getRequest();

      if (!user)
        throw new UnauthorizedException({
          success: 0,
          message: 'auth.token.invalid',
        });

      if (roleExpression === 'admin') return true;

      // console.log(!check(roleExpression, (operand: any) => _.includes([user?.roles[0]?.slug], operand)))
      // if (!check(roleExpression, (operand: any) => _.includes([user?.roles[0]?.slug], operand))) throw new UnauthorizedException({ success: 0, message: 'auth.inadequatePermission' })
      return true;
    }
  }
  return mixin(RolesMixin);
};

const Can = (permissionExpression: string): Type<CanActivate> => {
  class CanGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const { user } = context.switchToHttp().getRequest();

      if (!user) {
        throw new UnauthorizedException({
          success: 0,
          message: 'auth.token.invalid',
        });
      }

      if (!permissionExpression?.length) {
        throw new UnauthorizedException({
          success: 0,
          message: 'auth.inadequatePermission',
        });
      }
      const userPermissions = _.flatMap(
        user.roles,
        (role) => role.permissions.map((perm: any) => perm.slug),
        // console.log(role.permissions),
      );
      const hasPermission = check(permissionExpression, (operand: any) =>
        _.includes(userPermissions, operand),
      );

      if (!hasPermission) {
        throw new UnauthorizedException({
          success: 0,
          message: 'auth.inadequatePermission',
        });
      }

      return true;
    }
  }
  return mixin(CanGuardMixin);
};

export { Is, Can };
