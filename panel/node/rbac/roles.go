package rbac

// Role levels (higher = more access).
const (
	RoleViewer    = "viewer"
	RoleDeveloper = "developer"
	RoleAdmin     = "admin"
	RoleOwner     = "owner"
)

var roleLevel = map[string]int{
	RoleViewer:    1,
	RoleDeveloper: 2,
	RoleAdmin:     3,
	RoleOwner:     4,
}

// AtLeast returns true if role has at least the required level.
func AtLeast(role, required string) bool {
	return roleLevel[role] >= roleLevel[required]
}
