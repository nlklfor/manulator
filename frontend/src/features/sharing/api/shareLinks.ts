import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

function authHeader() {
  return { Authorization: `Bearer ${getAuthToken()}` };
}

function linksPath(manuscriptId: string) {
  return `/api/upload-manuscripts/${encodeURIComponent(manuscriptId)}/share-links`;
}

// Returned once, right after creating: the backend keeps only a hash of the token,
// so the url cannot be shown again later
export interface CreatedShareLink {
  id: string;
  url: string;
  expires_at: string;
}

// An active link in the owner's list (without the url, see above)
export interface ShareLink {
  id: string;
  expires_at: string;
  created_at: string;
  use_count: number;
}

export interface ShareLinkPreview {
  title: string;
  document_type: string;
  page_count: number;
  shared_by_username: string | null;
  is_owner: boolean;
}

// Creates a link that works for 24 hours
export function createShareLink(manuscriptId: string): Promise<CreatedShareLink> {
  return apiFetch<CreatedShareLink>(linksPath(manuscriptId), {
    method: "POST",
    headers: authHeader(),
  });
}

// The links of this manuscript that are not expired or revoked
export function listShareLinks(manuscriptId: string): Promise<ShareLink[]> {
  return apiFetch<ShareLink[]>(linksPath(manuscriptId), { headers: authHeader() });
}

export function revokeShareLink(linkId: string): Promise<void> {
  return apiFetch<void>(`/api/share-links/${encodeURIComponent(linkId)}`, {
    method: "DELETE",
    headers: authHeader(),
  });
}

// What the recipient sees before adding the manuscript.
// 404 means the link expired, was revoked or the manuscript was deleted.
export function previewShareLink(token: string): Promise<ShareLinkPreview> {
  return apiFetch<ShareLinkPreview>(`/api/share-links/${encodeURIComponent(token)}`, {
    headers: authHeader(),
  });
}

// Adds a copy to the logged-in user's library and returns the copy's id
export function acceptShareLink(token: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/api/share-links/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    headers: authHeader(),
  });
}
