import { Injectable, ConflictException, NotFoundException, UnauthorizedException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // TASK 2: Seed default permissions
    const permissions = [
      { name: 'Create_User', description: 'Can create users' },
      { name: 'Read_User', description: 'Can read user information' },
      { name: 'Update_User', description: 'Can update user information' },
      { name: 'Delete_User', description: 'Can delete users' },
      { name: 'Manage_User', description: 'Full access to user management' },
    ];

    const createdPermissions: any[] = [];
    for (const p of permissions) {
      const perm = await this.prisma.permission.upsert({
        where: { name: p.name },
        update: { description: p.description },
        create: { name: p.name, description: p.description },
      });
      createdPermissions.push(perm);
    }

    // Assign permissions to standard roles
    // NOTE: OWNER is used by some tenant creation flows; keep it permissioned to avoid RBAC lockouts.
    const adminRoles = ['BUSINESS_OWNER', 'OWNER', 'ADMIN', 'SUPER_ADMIN'];
    for (const roleName of adminRoles) {
      // Ensure official standard role exists.
      let standardRole = await this.prisma.role.findFirst({
        where: { name: roleName, tenantId: null, isStandard: true },
      });

      // If not found, look for any role with that name and no tenantId (legacy)
      if (!standardRole) {
        const legacy = await this.prisma.role.findFirst({
          where: { name: roleName, tenantId: null },
        });

        if (legacy) {
          standardRole = await this.prisma.role.update({
            where: { id: legacy.id },
            data: { isStandard: true },
          });
        }
      }

      if (!standardRole) {
        standardRole = await this.prisma.role.create({
          data: {
            name: roleName,
            isStandard: true,
            tenantId: null,
            company_id: null,
          },
        });
      }

      // Seed permissions to:
      // - the official standard role, AND
      // - any tenant-scoped roles with the same name (legacy/custom), so RBAC doesn't break.
      const rolesToSeed = await this.prisma.role.findMany({
        where: { name: roleName, deletedAt: null },
        select: { id: true },
      });

      for (const role of rolesToSeed) {
        for (const perm of createdPermissions) {
          await this.prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: perm.id,
            },
          });
        }
      }
    }
  }

  // TASK 4: createRole
  async createRole(dto: CreateRoleDto, userId: string, tenantId?: string, isAdmin: boolean = false) {
    // If admin → create standard role
    // If owner → create custom role with tenantId
    const isStandard = isAdmin ? (dto.isStandard ?? true) : false;
    const finalTenantId = isStandard ? null : tenantId;
    const finalCompanyId = finalTenantId; // Sync company_id with tenantId

    if (!isStandard && !finalTenantId) {
      throw new ForbiddenException('Tenant context required for custom roles');
    }

    const existing = await this.prisma.role.findFirst({
      where: {
        name: dto.name,
        OR: [
          { tenantId: finalTenantId },
          { company_id: finalCompanyId },
          { isStandard: isStandard, tenantId: null }
        ],
      },
    });

    if (existing) {
      throw new ConflictException(`Role with name ${dto.name} already exists for this context`);
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
        isStandard: isStandard,
        tenantId: finalTenantId,
        company_id: finalCompanyId,
      },
    });
  }

  // TASK 4: getRoles
  async getRoles(tenantId?: string, userRoles: string[] = []) {
    // Standardize tenantId (handle "null" or "undefined" strings from headers)
    const tid = (tenantId && tenantId !== 'null' && tenantId !== 'undefined') ? tenantId : null;

    const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
    const isBusinessOwner = userRoles.includes('BUSINESS_OWNER');
    const isAdminRole = userRoles.includes('ADMIN');

    // Define filter based on user role
    let whereClause: any = {
      OR: [
        { isStandard: true },
        ...(tid ? [
          { tenantId: tid },
          { company_id: tid }
        ] : [])
      ],
    };

    // If Business Owner -> hide SUPER_ADMIN and BUSINESS_OWNER from the list
    if (isBusinessOwner && !isSuperAdmin) {
      whereClause = {
        AND: [
          whereClause,
          {
            name: {
              notIn: ['SUPER_ADMIN', 'BUSINESS_OWNER']
            }
          }
        ]
      };
    }

    // If Admin (not Super Admin) -> hide SUPER_ADMIN, BUSINESS_OWNER, and ADMIN from the list
    // Only show Accountant and Team Member
    if (isAdminRole && !isSuperAdmin) {
      whereClause = {
        AND: [
          whereClause,
          {
            name: {
              notIn: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'ADMIN', 'OWNER']
            }
          }
        ]
      };
    }

    // Return standard roles + roles of current company only
    const roles = await this.prisma.role.findMany({
      where: whereClause,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Attach active user count per role for UI stats
    const roleIds = roles.map(r => r.id);
    if (roleIds.length === 0) return roles;

    const memberships = await this.prisma.userTenantMembership.findMany({
      where: {
        roleId: { in: roleIds },
        deletedAt: null,
        ...(tid ? { tenantId: tid } : {}),
        user: {
          deletedAt: null,
          isActive: true,
          registrationStatus: 'ACTIVE',
        },
      },
      select: { roleId: true },
    });

    const countsByRoleId = new Map<string, number>();
    for (const m of memberships) {
      countsByRoleId.set(m.roleId, (countsByRoleId.get(m.roleId) ?? 0) + 1);
    }

    return roles.map(role => ({
      ...role,
      userCount: countsByRoleId.get(role.id) ?? 0,
    }));
  }

  // TASK 5: assignPermissionToRole
  async assignPermissionsToRole(roleId: string, permissionIds: string[], userId: string, tenantId?: string, isAdmin: boolean = false) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Business Owner / Owner / Admin bypass for THEIR OWN custom roles or specific standard roles
    const isLocalManager = !isAdmin && tenantId;
    
    if (isLocalManager) {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { 
          userId, 
          tenantId,
          role: { name: { in: ['BUSINESS_OWNER', 'OWNER', 'ADMIN'] } }
        },
        include: { role: true }
      });

      if (membership) {
        const userRoleName = membership.role.name;

        // Protection: Business Owners can't touch SUPER_ADMIN or BUSINESS_OWNER
        if (userRoleName === 'BUSINESS_OWNER' || userRoleName === 'OWNER') {
          const protectedRoles = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'OWNER'];
          if (protectedRoles.includes(role.name)) {
            throw new ForbiddenException(`Business Owners cannot modify ${role.name} permissions`);
          }
        }

        // Protection: Admins can't touch SUPER_ADMIN, BUSINESS_OWNER, or ADMIN
        if (userRoleName === 'ADMIN') {
          const protectedRoles = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'OWNER', 'ADMIN'];
          if (protectedRoles.includes(role.name)) {
            throw new ForbiddenException(`Admins cannot modify ${role.name} permissions`);
          }
        }
        
        if (role.isStandard) {
          // If it's an allowed standard role, they ARE allowed.
          return this.updateRolePermissions(roleId, permissionIds);
        }

        if (role.tenantId !== tenantId) {
          throw new ForbiddenException('You can only modify roles belonging to your company');
        }
        // If it's a custom role of their company, they ARE allowed.
      } else {
        throw new ForbiddenException('Insufficient permissions to manage roles');
      }
    } else if (!isAdmin) {
      // Not an admin and not an owner/BO
      throw new ForbiddenException('Only administrators or business owners can modify roles');
    }

    // If it's an admin, they can do anything, or if it's an owner/BO and they passed the checks above.
    return this.updateRolePermissions(roleId, permissionIds);
  }

  private async updateRolePermissions(roleId: string, permissionIds: string[]) {
    // Clear existing and set new permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    return this.prisma.rolePermission.createMany({
      data: permissionIds.map(pId => ({
        roleId,
        permissionId: pId,
      })),
    });
  }

  async getPermissions() {
    return this.prisma.permission.findMany();
  }
}
