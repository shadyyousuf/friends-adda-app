import { MemberAvatar } from '../EventTypeHelpers'
import EventDetailDrawer from './EventDetailDrawer'

type AddMemberCandidate = {
  id: string
  full_name: string | null
  email: string
  role: string
  blood_group: string | null
}

export default function AddMembersDrawer({
  isOpen,
  members,
  selectedMemberIds,
  searchValue,
  activeAction,
  onSearchChange,
  onToggleMember,
  onAddMembers,
  onClose,
}: {
  isOpen: boolean
  members: AddMemberCandidate[]
  selectedMemberIds: string[]
  searchValue: string
  activeAction: string | null
  onSearchChange: (value: string) => void
  onToggleMember: (memberId: string) => void
  onAddMembers: () => void
  onClose: () => void
}) {
  const searchTerm = searchValue.trim().toLowerCase()

  return (
    <EventDetailDrawer
      isOpen={isOpen}
      eyebrow="Event members"
      title="Add Friend"
      onClose={onClose}
    >
      <div className="stack-md add-members-drawer-content">
        <label className="stack-xs add-members-search">
          <span className="field-label">Search members</span>
          <input
            type="text"
            className="field-input add-members-search-input"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search members"
          />
        </label>

        {members.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">
              {searchTerm ? 'No matching members' : 'No new members to add'}
            </h4>
          </div>
        ) : (
          <div className="add-members-list">
            {members.map((member) => {
              const checkboxId = `add-member-${member.id}`
              const isChecked = selectedMemberIds.includes(member.id)

              return (
                <label
                  key={member.id}
                  htmlFor={checkboxId}
                  className={`add-member-item${isChecked ? ' is-selected' : ''}`}
                >
                  <MemberAvatar
                    member={member}
                    avatarText={member.blood_group?.trim() || null}
                  />
                  <div className="stack-xs add-member-meta">
                    <strong className="info-value">
                      {member.full_name || 'Unnamed member'}
                    </strong>
                    <span className="member-directory-role-badge">
                      {member.role === 'admin' ? 'App Admin' : 'Member'}
                    </span>
                  </div>
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="add-member-checkbox"
                    checked={isChecked}
                    onChange={() => onToggleMember(member.id)}
                  />
                </label>
              )
            })}
          </div>
        )}

        <div className="add-members-toolbar">
          <span className="status-chip">
            {selectedMemberIds.length} selected
          </span>
          <div className="add-members-toolbar-actions">
            <button
              type="button"
              className="primary-button"
              disabled={
                selectedMemberIds.length === 0 || activeAction === 'add-members'
              }
              onClick={onAddMembers}
            >
              {activeAction === 'add-members'
                ? 'Adding...'
                : `Add Friend (${selectedMemberIds.length})`}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={activeAction === 'add-members'}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </EventDetailDrawer>
  )
}
